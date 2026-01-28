import { Response } from "express";
import { Types } from "mongoose";
import { randomUUID } from "crypto";
import { AuthRequest } from "../middleware/auth";
import Invoice from "../models/Invoice";
import InvoiceEdit from "../models/InvoiceEdit";
import Customer from "../models/Customer";
import User from "../models/User";
import Payment from "../models/Payment";
import { getRedisClient } from "../config/redis";
import Role from "../models/Role";
import Estimate from "../models/Estimate";
import {
  calculateInvoice,
  normalizeAndValidateItem,
  canAcceptDeposit,
  InvoiceItem,
} from "../utils/invoiceCalculations";
    
type IncomingItem = {
  productCode?: string;
  description?: string;
  quantity?: number;
  price?: number;
  discount?: number;
};

const normalizePaymentTerms = (term?: string) => {
  const t = (term || "").toLowerCase().replace(/\s+/g, "");
  switch (t) {
    case "net7":
    case "net-7":
      return "net7" as const;
    case "net15":
    case "net-15":
      return "net15" as const;
    case "net30":
    case "net-30":
      return "net30" as const;
    case "net60":
    case "net-60":
      return "net60" as const;
    case "dueonreceipt":
    case "dueonreceipts":
    case "dueonreceip":
      return "dueOnReceipt" as const;
    default:
      return null;
  }
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const generateInvoiceNumber = async (): Promise<string> => {
  let attempts = 0;
  while (attempts < 5) {
    const raw = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const invoiceNumber = `INV-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    const exists = await Invoice.findOne({ invoiceNumber }).lean();
    if (!exists) {
      return invoiceNumber;
    }
    attempts += 1;
  }
  throw new Error("Unable to generate unique invoice number");
};

const INVOICE_LIST_CACHE_KEY = "invoices:all";
const INVOICE_CACHE_PREFIX = "invoices:";
const INVOICE_CACHE_TTL_SECONDS = 300;

const runCacheOps = async (ops: Promise<unknown>[]) => {
  if (!ops.length) return;
  try {
    await Promise.all(ops);
  } catch (err) {
    console.error("Redis cache error:", err);
  }
};

const invalidateInvoiceListCaches = async (cacheClient: any) => {
  try {
    const keys: string[] = [];
    for await (const key of cacheClient.scanIterator({ MATCH: `${INVOICE_LIST_CACHE_KEY}:*` })) {
      keys.push(key as string);
    }
    // Also include the legacy/all key
    keys.push(INVOICE_LIST_CACHE_KEY);
    if (keys.length) {
      await cacheClient.del(...keys);
    }
  } catch (err) {
    console.error("Redis cache error (invalidate invoice lists):", err);
  }
};

/**
 * Calculate total spent by a customer (sum of all deposits from all their payments)
 */
const calculateCustomerTotalSpent = async (customerId: Types.ObjectId): Promise<number> => {
  try {
    // Sum all deposits from the deposits array for this customer
    const result = await Payment.aggregate([
      { $match: { customerId } },
      { $unwind: "$deposits" },
      { $group: { _id: null, total: { $sum: "$deposits.amount" } } },
    ]);
    // Fallback to amount field if no deposits array (for backward compatibility)
    if (result.length === 0) {
      const fallbackResult = await Payment.aggregate([
        { $match: { customerId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      return fallbackResult.length > 0 ? Number(fallbackResult[0].total.toFixed(2)) : 0;
    }
    return Number(result[0].total.toFixed(2));
  } catch (error) {
    console.error("Error calculating customer total spent:", error);
    return 0;
  }
};

/**
 * Create or update a payment record for an invoice deposit
 * 
 * Rules:
 * - CREATE: Different customer (new payment record)
 * - UPDATE: Same customer (regardless of invoice) - update existing payment record
 *   - Add invoiceId to invoiceIds array if not already present
 *   - Increment amount and depositCount
 * 
 * Returns the payment ID (existing or newly created)
 */
const createOrUpdatePaymentRecord = async (
  customerId: Types.ObjectId,
  invoiceId: Types.ObjectId,
  amount: number,
  recordedBy?: Types.ObjectId,
  paymentMethod: "cash" | "card" | "bank_transfer" | "cheque" | "other" = "cash"
): Promise<Types.ObjectId | null> => {
  try {
    // Check if a payment already exists for this customer (one payment record per customer)
    const existingPayment = await Payment.findOne({
      customerId,
    }).lean();

    let paymentId: Types.ObjectId;

    if (existingPayment) {
      // UPDATE: Same customer - update existing payment
      paymentId = existingPayment._id as Types.ObjectId;
      
      // Check if invoiceId is already in the invoiceIds array
      const invoiceIdString = invoiceId.toString();
      const invoiceIds = existingPayment.invoiceIds || [];
      const invoiceIdExists = invoiceIds.some(
        (id: Types.ObjectId) => id.toString() === invoiceIdString
      );

      // Create new deposit record with individual payment method
      const newDepositRecord = {
        amount: Number(amount.toFixed(2)),
        paymentMethod,
        invoiceId,
        date: new Date(),
        recordedBy,
      };

      // Calculate new cumulative amount (sum of all deposits including new one)
      // Handle both new structure (deposits array) and legacy structure (amount field)
      const existingDeposits = existingPayment.deposits || [];
      let existingTotal = 0;
      
      if (existingDeposits.length > 0) {
        // New structure: sum from deposits array
        existingTotal = existingDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      } else {
        // Legacy structure: use amount field
        existingTotal = Number(existingPayment.amount || 0);
      }
      
      const newAmount = Number((existingTotal + amount).toFixed(2));
      const newDepositCount = Math.max(existingDeposits.length, existingPayment.depositCount || 0) + 1;

      // Recalculate total spent by customer
      const currentTotalSpent = await calculateCustomerTotalSpent(customerId);
      const oldAmount = existingPayment.amount;
      const newTotalSpent = Number((currentTotalSpent - oldAmount + newAmount).toFixed(2));

      // Build update query with $push, $set, and optionally $addToSet
      const updateQuery: any = {
        $push: {
          deposits: newDepositRecord, // Add new deposit record to array
        },
        $set: {
          amount: newAmount, // Cumulative total
          totalSpent: newTotalSpent,
          depositCount: newDepositCount,
          paymentDate: new Date(), // Latest deposit date
          paymentMethod, // Latest payment method (for backward compatibility)
          ...(recordedBy && { recordedBy }), // Latest recordedBy
        },
      };

      // Add invoiceId to array if not already present
      if (!invoiceIdExists) {
        updateQuery.$addToSet = {
          invoiceIds: invoiceId,
        };
      }

      await Payment.findByIdAndUpdate(existingPayment._id, updateQuery);

      // Update all invoices in the payment's invoiceIds array with the paymentId
      // Fetch updated payment to get the complete invoiceIds array (including newly added one)
      const updatedPayment = await Payment.findById(existingPayment._id).lean();
      const allInvoiceIds = updatedPayment?.invoiceIds || [];
      
      // Always include current invoiceId to ensure it's updated
      const invoiceIdsToUpdate = [
        ...allInvoiceIds,
        invoiceId, // Current invoice (will be deduplicated by updateMany)
      ];
      
      if (invoiceIdsToUpdate.length > 0) {
        await Invoice.updateMany(
          { _id: { $in: invoiceIdsToUpdate } },
          { $set: { paymentId } }
        );
      }
    } else {
      // CREATE: No existing payment for this customer - create new payment record
      // Calculate total spent by customer (before adding this payment)
      const totalSpent = await calculateCustomerTotalSpent(customerId);
      const newTotalSpent = Number((totalSpent + amount).toFixed(2));

      // First deposit for this customer
      const depositCount = 1;

      // Create first deposit record
      const firstDepositRecord = {
        amount: Number(amount.toFixed(2)),
        paymentMethod,
        invoiceId,
        date: new Date(),
        recordedBy,
      };

      // Create new payment record with deposits array
      const newPayment = await Payment.create({
        customerId,
        invoiceIds: [invoiceId], // Array with single invoice
        deposits: [firstDepositRecord], // Array with first deposit record
        amount, // Cumulative total (same as first deposit for now)
        totalSpent: newTotalSpent,
        depositCount,
        paymentMethod, // Latest payment method (for backward compatibility)
        recordedBy, // Latest recordedBy
        paymentDate: new Date(), // Latest deposit date
      });

      paymentId = newPayment._id as Types.ObjectId;

      // Update customer with paymentId (first time payment is created)
      await Customer.findByIdAndUpdate(customerId, {
        $set: { paymentId },
      });

      // Update the invoice with paymentId
      await Invoice.findByIdAndUpdate(invoiceId, {
        $set: { paymentId },
      });
    }

    return paymentId;
  } catch (error) {
    console.error("Error creating/updating payment record:", error);
    // Don't throw - payment creation/update failure shouldn't break invoice creation/update
    // But log it for investigation
    return null;
  }
};

const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      customerId,
      salesRepId,
      items,
      message,
      signature,
      paymentTerms,
      depositReceived = 0,
    } = req.body || {};
    const estimateReference =
      typeof req.query?.estimateReference === "string"
        ? req.query.estimateReference.trim()
        : "";

    if (estimateReference) {
      const existingInvoice = await Invoice.findOne({ estimateReference }).lean();
      if (existingInvoice) {
        return res.status(409).json({
          message: "Invoice already exists for this estimate reference",
        });
      }
    }

    if (!customerId || !Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Valid customerId is required" });
    }

    const customer = await Customer.findById(new Types.ObjectId(customerId)).lean();
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (!salesRepId || !Types.ObjectId.isValid(salesRepId)) {
      return res.status(400).json({ message: "Valid salesRepId is required" });
    }
    const salesRep = await User.findById(new Types.ObjectId(salesRepId)).lean();
    if (!salesRep) {
      return res.status(404).json({ message: "Sales representative not found" });
    }
    const salesRepRole = await Role.findOne({ name: "Sales Representative" }).lean();
    if (!salesRepRole) {
      return res.status(500).json({ message: "Sales representative role not configured" });
    }
    const hasSalesRepRole = Array.isArray(salesRep.roleIds)
      && salesRep.roleIds.some((rid: any) => rid?.toString() === salesRepRole._id.toString());
    if (!hasSalesRepRole) {
      return res.status(403).json({ message: "User is not a Sales Representative" });
    }
    const salesRepObjectId = salesRep._id as Types.ObjectId;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    // Normalize and validate all items using the shared utility
    const normalizedItems: InvoiceItem[] = [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx] as IncomingItem;
      const normalized = normalizeAndValidateItem(item, idx);
      normalizedItems.push(normalized);
    }

    const deposit = Number(depositReceived ?? 0);
    if (!Number.isFinite(deposit) || deposit < 0) {
      return res.status(400).json({ message: "depositReceived must be a non-negative number" });
    }

    const term = normalizePaymentTerms(paymentTerms);
    if (!term) {
      return res.status(400).json({ message: "Invalid paymentTerms" });
    }

    const issuedAt = new Date();
    const dueDate =
      term === "dueOnReceipt"
        ? issuedAt
        : term === "net7"
        ? addDays(issuedAt, 7)
        : term === "net15"
        ? addDays(issuedAt, 15)
        : term === "net30"
        ? addDays(issuedAt, 30)
        : addDays(issuedAt, 60);

    // Use the shared calculation utility - this is the SINGLE SOURCE OF TRUTH
    // Invoice total ALWAYS includes tax (subtotal + 12.5% VAT)
    const calculated = calculateInvoice({
      items: normalizedItems,
      depositReceived: deposit,
    });

    const invoiceNumber = await generateInvoiceNumber();

    // Get estimate ID if converting from estimate
    let convertedFromEstimateId: Types.ObjectId | undefined = undefined;
    if (estimateReference) {
      try {
        const estimate = await Estimate.findOne({ reference: estimateReference }).lean();
        if (estimate) {
          convertedFromEstimateId = estimate._id as Types.ObjectId;
        }
      } catch (err) {
        console.error("Failed to find estimate for convertedFromEstimate:", err);
      }
    }

    const invoice = await Invoice.create({
      invoiceNumber,
      customerId: new Types.ObjectId(customerId),
      salesRep: salesRepObjectId,
      items: normalizedItems,
      message: (message || "").trim() || undefined,
      signature: (signature || "").trim() || undefined,
      estimateReference: estimateReference || undefined,
      convertedFromEstimate: convertedFromEstimateId,
      paymentTerms: term,
      depositReceived: calculated.depositReceived,
      status: calculated.status,
      total: calculated.total,
      due: calculated.due,
      balanceDue: calculated.balanceDue,
      issuedAt,
      dueDate,
    });

    // Create the initial invoice edit record (for audit trail - first time invoice is generated)
    const initialDepositAdded = calculated.depositReceived; // For initial creation, depositAdded equals total deposit
    const paymentMethod = (req.body.paymentMethod as any) || "cash";
    const invoiceEdit = await InvoiceEdit.create({
      invoiceReference: invoiceNumber,
      baseInvoiceId: invoice._id as Types.ObjectId,
      previousVersionId: invoice._id as Types.ObjectId, // First version references itself
      previousVersionSource: "invoice", // Coming from base invoice
      customerId: new Types.ObjectId(customerId),
      salesRep: salesRepObjectId,
      items: normalizedItems,
      message: (message || "").trim() || undefined,
      signature: (signature || "").trim() || undefined,
      estimateReference: estimateReference || undefined,
      convertedFromEstimate: convertedFromEstimateId,
      paymentTerms: term,
      depositReceived: calculated.depositReceived,
      depositAdded: initialDepositAdded,
      paymentMethod: calculated.depositReceived > 0 ? paymentMethod : undefined,
      balanceAfterEdit: calculated.balanceDue,
      status: calculated.status,
      total: calculated.total,
      due: calculated.due,
      balanceDue: calculated.balanceDue,
      issuedAt,
      dueDate,
    });

    // Update the invoice with the edit reference
    await Invoice.findByIdAndUpdate(invoice._id, {
      $push: { editIds: invoiceEdit._id },
      $inc: { editCount: 1 },
    });

    // Create or update payment record if deposit was received
    if (calculated.depositReceived > 0) {
      const recordedBy = req.user?.userId && Types.ObjectId.isValid(req.user.userId)
        ? new Types.ObjectId(req.user.userId)
        : undefined;
      await createOrUpdatePaymentRecord(
        new Types.ObjectId(customerId),
        invoice._id as Types.ObjectId,
        calculated.depositReceived,
        recordedBy,
        (req.body.paymentMethod as any) || "cash"
      );
    }

    if (estimateReference) {
      try {
        await Estimate.findOneAndUpdate(
          { reference: estimateReference },
          { status: "converted" }
        );
      } catch (err) {
        console.error("Failed to update estimate status:", err);
      }
    }

    const cacheClient = await getRedisClient();
    if (cacheClient) {
      const invoiceKey = `${INVOICE_CACHE_PREFIX}${invoice._id.toString()}`;
      await runCacheOps([
        cacheClient.setEx(invoiceKey, INVOICE_CACHE_TTL_SECONDS, JSON.stringify(invoice)),
        invalidateInvoiceListCaches(cacheClient),
      ]);
    }

    return res.status(201).json({
      message: "Invoice created successfully",
      invoice: {
        ...invoice.toObject(),
        // Include calculated values for clarity
        subtotal: calculated.subtotal,
        tax: calculated.tax,
      },
    });
  } catch (error: any) {
    console.error("Create invoice error:", error);
    return res.status(500).json({
      message: "Error creating invoice",
      errorMessage: error?.message,
    });
  }
};

const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const cacheKey = `${INVOICE_LIST_CACHE_KEY}:${offset}:${limit}`;
    let totalOverride: number | null = null;

    const cacheClient = await getRedisClient();
    if (cacheClient) {
      try {
        const cached = await cacheClient.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const cachedTotal = Number(parsed?.meta?.total ?? 0);
          if (offset === 0) {
            const currentTotal = await Invoice.countDocuments({});
            if (currentTotal === cachedTotal) {
              return res.status(200).json({
                message: "Invoices fetched successfully",
                ...parsed,
              });
            }
            totalOverride = currentTotal;
          } else {
            return res.status(200).json({
              message: "Invoices fetched successfully",
              ...parsed,
            });
          }
        }
      } catch (err) {
        console.error("Redis cache read error (invoice list):", err);
      }
    }

    const [invoices, total] = await Promise.all([
      Invoice.find({})
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate("customerId", "name email phone billingAddress shippingAddress")
        .populate("salesRep", "fullName email")
        .lean(),
      totalOverride === null ? Invoice.countDocuments({}) : Promise.resolve(totalOverride),
    ]);

    // Map invoices ensuring we return the correct values from the base invoice
    // The base invoice is already updated on each edit, so these values are current
    const mapped = invoices.map((inv: any) => {
      const customer = inv.customerId || {};
      const salesRep = inv.salesRep || {};
      
      // The base invoice stores the current total (with tax), balance, and status
      // These are synced on every update, so they reflect the latest state
      return {
        id: inv._id,
        reference: inv.invoiceNumber,
        customer: customer.name || customer.email || "",
        customerId: customer._id || inv.customerId,
        date: inv.issuedAt,
        dueDate: inv.dueDate,
        status: inv.status, // Current status (derived from balance)
        salesRep: salesRep.fullName || salesRep.email || "",
        total: inv.total, // Invoice total WITH tax
        balance: inv.balanceDue, // Current balance (can be negative if overpaid)
        depositReceived: inv.depositReceived, // Total deposit received
      };
    });

    if (cacheClient) {
      await runCacheOps([
        cacheClient.setEx(
          cacheKey,
          INVOICE_CACHE_TTL_SECONDS,
          JSON.stringify({
            invoices: mapped,
            meta: {
              total,
              limit,
              offset,
              hasMore: offset + limit < total,
            },
          })
        ),
      ]);
    }

    return res.status(200).json({
      message: "Invoices fetched successfully",
      invoices: mapped,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error("Get invoices error:", error);
    return res.status(500).json({
      message: "Error fetching invoices",
      errorMessage: error?.message,
    });
  }
};

const getInvoiceById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice id" });
    }

    // Note: We skip cache for now to ensure fresh data consistency
    // The base invoice is already updated on each edit, so we can just read it

    const invoice = await Invoice.findById(new Types.ObjectId(id))
      .populate("customerId", "name email phone billingAddress shippingAddress")
      .populate("salesRep", "fullName email")
      .lean();

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // The base invoice should already reflect the latest state (synced on update)
    // But we recalculate to ensure consistency
    const items = (invoice.items || []).map((item: any) => ({
      productCode: item.productCode || "",
      description: item.description || "",
      quantity: Number(item.quantity ?? 0),
      discount: Number(item.discount ?? 0),
      amount: Number(item.amount ?? 0),
    }));

    // Recalculate using the shared utility to ensure values are correct
    const calculated = calculateInvoice({
      items,
      depositReceived: Number(invoice.depositReceived ?? 0),
    });

    const customerData = invoice.customerId as any;
    const salesRepData = invoice.salesRep as any;

    const responseInvoice = {
      invoiceId: invoice._id,
      invoiceReferenceNumber: invoice.invoiceNumber,
      customerId: customerData?._id || invoice.customerId,
      customerName: customerData?.name || customerData?.email || "",
      customerEmail: customerData?.email || "",
      customerPhone: customerData?.phone || "",
      customerBillingAddress: customerData?.billingAddress || "",
      customerShippingAddress: customerData?.shippingAddress || "",
      salesRepId: salesRepData?._id || invoice.salesRep,
      salesRepName: salesRepData?.fullName || salesRepData?.email || "",
      productDetails: items,
      message: invoice.message,
      signature: invoice.signature,
      paymentTerms: invoice.paymentTerms,
      estimateReference: invoice.estimateReference,
      issuedAt: invoice.issuedAt,
      dueDate: invoice.dueDate,
      // Core financial values from calculation (source of truth)
      subtotal: calculated.subtotal,
      tax: calculated.tax,
      total: calculated.total,
      depositReceived: calculated.depositReceived,
      totalDepositReceived: calculated.depositReceived,
      balanceDue: calculated.balanceDue,
      due: calculated.due,
      status: calculated.status,
      // Edit tracking
      editCount: invoice.editCount || 0,
    };

    const cacheClient = await getRedisClient();
    if (cacheClient) {
      const invoiceKey = `${INVOICE_CACHE_PREFIX}${id}`;
      await runCacheOps([
        cacheClient.setEx(
          invoiceKey,
          INVOICE_CACHE_TTL_SECONDS,
          JSON.stringify(responseInvoice)
        ),
      ]);
    }

    return res.status(200).json({
      message: "Invoice fetched successfully",
      invoice: responseInvoice,
    });
  } catch (error: any) {
    console.error("Get invoice error:", error);
    return res.status(500).json({
      message: "Error fetching invoice",
      errorMessage: error?.message,
    });
  }
};

/**
 * Check if invoice items have changed by comparing current and new items
 * Returns true if items changed (added, removed, or modified), false if identical
 */
const checkIfItemsChanged = (
  currentItems: InvoiceItem[],
  newItems: InvoiceItem[]
): boolean => {
  // Different number of items means change
  if (currentItems.length !== newItems.length) {
    return true;
  }

  // If no items, consider it unchanged (edge case)
  if (currentItems.length === 0 && newItems.length === 0) {
    return false;
  }

  // Create normalized comparison maps
  // Use productCode + quantity + discount + amount as composite key to handle duplicates
  const normalizeItem = (item: InvoiceItem) => {
    return {
      productCode: (item.productCode || "").toLowerCase().trim(),
      quantity: Number(item.quantity || 0),
      discount: Number(item.discount || 0),
      amount: Number(item.amount || 0),
    };
  };

  const currentNormalized = currentItems.map(normalizeItem).sort((a, b) => {
    // Sort by productCode for consistent comparison
    return a.productCode.localeCompare(b.productCode);
  });

  const newNormalized = newItems.map(normalizeItem).sort((a, b) => {
    return a.productCode.localeCompare(b.productCode);
  });

  // Compare each item
  for (let i = 0; i < currentNormalized.length; i++) {
    const current = currentNormalized[i];
    const newItem = newNormalized[i];

    // Compare all fields with tolerance for floating point
    const productCodeMatch = current.productCode === newItem.productCode;
    const quantityMatch = Math.abs(current.quantity - newItem.quantity) < 0.01;
    const discountMatch = Math.abs(current.discount - newItem.discount) < 0.01;
    const amountMatch = Math.abs(current.amount - newItem.amount) < 0.01;

    if (!productCodeMatch || !quantityMatch || !discountMatch || !amountMatch) {
      return true; // Items changed
    }
  }

  // All items match - no changes
  return false;
};

const getInvoiceEdits = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid invoice id" });
    }

    const invoice = await Invoice.findById(new Types.ObjectId(id))
      .populate("customerId", "name email phone billingAddress shippingAddress")
      .populate("salesRep", "fullName email")
      .lean();

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const edits = await InvoiceEdit.find({ baseInvoiceId: invoice._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "Invoice edits fetched successfully",
      invoice,
      edits,
    });
  } catch (error: any) {
    console.error("Get invoice edits error:", error);
    return res.status(500).json({
      message: "Error fetching invoice edits",
      errorMessage: error?.message,
    });
  }
};

const updateInvoice = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const invoiceReference =
      typeof req.body?.invoiceReference === "string"
        ? req.body.invoiceReference.trim()
        : typeof req.body?.invoiceNumber === "string"
        ? req.body.invoiceNumber.trim()
        : typeof req.body?.reference === "string"
        ? req.body.reference.trim()
        : "";
    const { items, depositReceived = 0 } = req.body || {};

    let baseInvoice: any = null;
    if (id && Types.ObjectId.isValid(id)) {
      baseInvoice = await Invoice.findById(new Types.ObjectId(id)).lean();
    }
    if (!baseInvoice && invoiceReference) {
      baseInvoice = await Invoice.findOne({ invoiceNumber: invoiceReference }).lean();
    }
    if (!baseInvoice) {
      return res.status(404).json({ message: "Invoice reference not found" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    // Normalize and validate all items using the shared utility
    const normalizedItems: InvoiceItem[] = [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx] as IncomingItem;
      const normalized = normalizeAndValidateItem(item, idx);
      normalizedItems.push(normalized);
    }

    const newDeposit = Number(depositReceived ?? 0);
    if (!Number.isFinite(newDeposit) || newDeposit < 0) {
      return res.status(400).json({ message: "depositReceived must be a non-negative number" });
    }

    // Get the current state (from latest edit or base invoice)
    const latestEdit = await InvoiceEdit.findOne({ baseInvoiceId: baseInvoice._id })
      .sort({ createdAt: -1 })
      .lean();
    
    const previousDeposit = Number(
      latestEdit?.depositReceived ?? baseInvoice.depositReceived ?? 0
    );

    // Get current items (from latest edit or base invoice)
    const currentItems = (latestEdit?.items || baseInvoice.items || []) as InvoiceItem[];
    
    // Check if nothing has changed
    const itemsChanged = checkIfItemsChanged(currentItems, normalizedItems);
    const depositChanged = Math.abs(newDeposit - previousDeposit) > 0.01; // Allow for floating point precision
    
    // If nothing changed, reject the update
    if (!itemsChanged && !depositChanged) {
      return res.status(400).json({
        message: "No changes detected. Invoice items, quantities, prices, discounts, and deposit remain the same. Please make changes before updating.",
      });
    }
    
    // FIRST: Calculate what the NEW total would be with the NEW items
    // This is crucial for the deposit rule check - if items increase the total,
    // the balance may become positive again, allowing deposits
    const newCalculation = calculateInvoice({
      items: normalizedItems,
      depositReceived: previousDeposit, // Use previous deposit first to get the "before new deposit" balance
    });
    
    // The balance BEFORE applying the new deposit (with new items but old deposit)
    const balanceBeforeNewDeposit = newCalculation.balanceDue;
    
    // Check if deposit can be accepted
    // Key rule: deposits only allowed if balance is positive (partial/pending)
    // Exception: if items changed and balance becomes positive, deposits become allowed again
    const depositCheck = canAcceptDeposit(
      balanceBeforeNewDeposit,
      newDeposit,
      previousDeposit
    );
    
    if (!depositCheck.allowed) {
      return res.status(400).json({
        message: depositCheck.message || "Deposit not allowed",
      });
    }
    
    // Now calculate with the new deposit
    const calculated = calculateInvoice({
      items: normalizedItems,
      depositReceived: newDeposit,
    });

    const depositAdded = Number((newDeposit - previousDeposit).toFixed(2));
    const paymentMethod = (req.body.paymentMethod as any) || "cash";
    
    const previousVersionId =
      Array.isArray(baseInvoice.editIds) && baseInvoice.editIds.length > 0
        ? baseInvoice.editIds[baseInvoice.editIds.length - 1]
        : baseInvoice._id;
    const previousVersionSource =
      Array.isArray(baseInvoice.editIds) && baseInvoice.editIds.length > 0 ? "edit" : "invoice";

    // Create the invoice edit record (for audit trail)
    const invoiceEdit = await InvoiceEdit.create({
      invoiceReference: invoiceReference || baseInvoice.invoiceNumber,
      baseInvoiceId: baseInvoice._id,
      previousVersionId,
      previousVersionSource,
      customerId: new Types.ObjectId(baseInvoice.customerId),
      salesRep: baseInvoice.salesRep ? new Types.ObjectId(baseInvoice.salesRep) : undefined,
      items: normalizedItems,
      message: baseInvoice.message,
      signature: baseInvoice.signature,
      estimateReference: baseInvoice.estimateReference,
      convertedFromEstimate: baseInvoice.convertedFromEstimate,
      paymentTerms: baseInvoice.paymentTerms,
      depositReceived: calculated.depositReceived,
      depositAdded,
      paymentMethod: depositAdded > 0 ? paymentMethod : undefined,
      balanceAfterEdit: calculated.balanceDue,
      status: calculated.status,
      total: calculated.total,
      due: calculated.due,
      balanceDue: calculated.balanceDue,
      issuedAt: baseInvoice.issuedAt ? new Date(baseInvoice.issuedAt) : new Date(),
      dueDate: baseInvoice.dueDate ? new Date(baseInvoice.dueDate) : undefined,
    });

    // CRITICAL: Update the BASE invoice to match the latest edit
    // This ensures list page shows correct current state
    await Invoice.findByIdAndUpdate(baseInvoice._id, {
      $push: { editIds: invoiceEdit._id },
      $inc: { editCount: 1 },
      $set: {
        items: normalizedItems,
        total: calculated.total,
        balanceDue: calculated.balanceDue,
        depositReceived: calculated.depositReceived,
        status: calculated.status,
        due: calculated.due,
      },
    });

    // Create or update payment record if a new deposit was added
    if (depositAdded > 0) {
      const recordedBy = req.user?.userId && Types.ObjectId.isValid(req.user.userId)
        ? new Types.ObjectId(req.user.userId)
        : undefined;
      await createOrUpdatePaymentRecord(
        new Types.ObjectId(baseInvoice.customerId),
        baseInvoice._id as Types.ObjectId,
        depositAdded,
        recordedBy,
        (req.body.paymentMethod as any) || "cash"
      );
    }

    const cacheClient = await getRedisClient();
    if (cacheClient) {
      const invoiceKey = `${INVOICE_CACHE_PREFIX}${baseInvoice._id.toString()}`;
      await runCacheOps([
        cacheClient.del(invoiceKey),
        invalidateInvoiceListCaches(cacheClient),
      ]);
    }

    return res.status(201).json({
      message: "Invoice updated successfully",
      invoiceEdit: {
        ...invoiceEdit.toObject(),
        // Include calculated values for clarity
        subtotal: calculated.subtotal,
        tax: calculated.tax,
      },
    });
  } catch (error: any) {
    console.error("Update invoice error:", error);
    return res.status(500).json({
      message: "Error updating invoice",
      errorMessage: error?.message,
    });
  }
};

const deleteInvoice = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid invoice id" });
  }

  const cacheClient = await getRedisClient();
  if (cacheClient) {
    await runCacheOps([
      invalidateInvoiceListCaches(cacheClient),
      cacheClient.del(`${INVOICE_CACHE_PREFIX}${id}`),
    ]);
  }

  return res.status(200).json({
    message: "Invoice deleted successfully",
    id: req.params.id,
  });
};

export { createInvoice, getInvoices, getInvoiceById, getInvoiceEdits, updateInvoice, deleteInvoice };