import { Response } from "express";
import { Types } from "mongoose";
import { randomUUID } from "crypto";
import { AuthRequest } from "../middleware/auth";
import Receipt from "../models/Receipt";
import Customer from "../models/Customer";
import User from "../models/User";
import Role from "../models/Role";
import Invoice from "../models/Invoice";
import InvoiceEdit from "../models/InvoiceEdit";
import {
  validateObjectId,
  validateString,
} from "../utils/validation";

const TAX_RATE = 0.125; // 12.5% VAT

type IncomingReceiptItem = {
  productId?: string; // Optional - if not provided, will be looked up by productCode
  productCode?: string;
  description?: string;
  quantity?: number;
  price?: number;
  discount?: number;
};

/**
 * Generate unique receipt number in format RCP-XXXX-XXXX
 */
const generateReceiptNumber = async (): Promise<string> => {
  let attempts = 0;
  while (attempts < 5) {
    const raw = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const receiptNumber = `RCP-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    const exists = await Receipt.findOne({ receiptNumber }).lean();
    if (!exists) {
      return receiptNumber;
    }
    attempts += 1;
  }
  throw new Error("Unable to generate unique receipt number");
};

/**
 * Calculate receipt totals
 */
const calculateReceiptTotals = (items: Array<{
  quantity: number;
  price: number;
  discount: number;
  amount: number;
}>) => {
  // Subtotal before discount: sum of (quantity * price)
  const subtotalBeforeDiscount = items.reduce(
    (sum, item) => sum + (item.quantity * item.price),
    0
  );

  // Subtotal after discount: sum of item amounts (after applying discounts)
  const subtotalAfterDiscount = items.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  // Tax: 12.5% of subtotal after discount
  const tax = Number((subtotalAfterDiscount * TAX_RATE).toFixed(2));

  // Total: subtotal after discount + tax
  const total = Number((subtotalAfterDiscount + tax).toFixed(2));

  return {
    subtotalBeforeDiscount: Number(subtotalBeforeDiscount.toFixed(2)),
    subtotalAfterDiscount: Number(subtotalAfterDiscount.toFixed(2)),
    tax,
    total,
  };
};

/**
 * Validate and normalize receipt item
 */
const normalizeAndValidateItem = async (
  item: IncomingReceiptItem,
  index: number
): Promise<{
  productId: Types.ObjectId;
  productCode: string;
  description?: string;
  quantity: number;
  price: number;
  discount: number;
  amount: number;
}> => {
  const errors: string[] = [];

  // Validate productCode (required)
  const productCodeValidation = validateString(item.productCode, {
    required: true,
    fieldName: "productCode",
  });
  if (!productCodeValidation.isValid) {
    errors.push(`productCode: ${productCodeValidation.error}`);
  }

  // Generate a dummy productId for now (product validation removed temporarily)
  // If productId is provided, use it; otherwise generate a new ObjectId
  let productId: Types.ObjectId;
  if (item.productId) {
    const productIdValidation = validateObjectId(item.productId, true);
    if (productIdValidation.isValid && productIdValidation.value) {
      productId = new Types.ObjectId(productIdValidation.value);
    } else {
      // If invalid, generate a new ObjectId
      productId = new Types.ObjectId();
    }
  } else {
    // Generate a new ObjectId for the product
    productId = new Types.ObjectId();
  }

  // Validate description (optional)
  const descriptionValidation = validateString(item.description, {
    required: false,
    maxLength: 500,
  });
  if (!descriptionValidation.isValid) {
    errors.push(`description: ${descriptionValidation.error}`);
  }

  // Validate quantity
  const quantity = Number(item.quantity ?? 0);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.push("quantity must be > 0");
  }

  // Validate price
  const price = Number(item.price ?? 0);
  if (!Number.isFinite(price) || price < 0) {
    errors.push("price must be >= 0");
  }

  // Validate discount
  const discount = Number(item.discount ?? 0);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    errors.push("discount must be between 0 and 100");
  }

  if (errors.length) {
    throw new Error(`Item ${index + 1}: ${errors.join(", ")}`);
  }

  // Calculate amount: quantity * price * (1 - discount/100)
  const amount = Number((quantity * price * (1 - discount / 100)).toFixed(2));

  return {
    productId,
    productCode: productCodeValidation.value!,
    description: descriptionValidation.value || undefined,
    quantity,
    price,
    discount,
    amount,
  };
};

/**
 * Create a new receipt (cash sale only)
 * POST /api/v1/receipt
 */
export const createReceipt = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const {
      customerId,
      salesRepId,
      saleType,
      items,
      message,
      signature,
      status,
      print,
    } = req.body || {};

    // Validate saleType - only cash sales allowed
    if (saleType !== "cash") {
      res.status(400).json({
        message: "Only cash sales are allowed. Use invoice endpoint for invoice payments.",
      });
      return;
    }

    // Validate customerId
    const customerIdValidation = validateObjectId(customerId, true);
    if (!customerIdValidation.isValid) {
      res.status(400).json({ message: `customerId: ${customerIdValidation.error}` });
      return;
    }

    const customerObjectId = new Types.ObjectId(customerIdValidation.value!);
    const customer = await Customer.findById(customerObjectId).lean();
    if (!customer) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }

    // Validate salesRepId
    const salesRepIdValidation = validateObjectId(salesRepId, true);
    if (!salesRepIdValidation.isValid) {
      res.status(400).json({ message: `salesRepId: ${salesRepIdValidation.error}` });
      return;
    }

    const salesRepObjectId = new Types.ObjectId(salesRepIdValidation.value!);
    const salesRep = await User.findById(salesRepObjectId).lean();
    if (!salesRep) {
      res.status(404).json({ message: "Sales representative not found" });
      return;
    }

    // Verify sales rep role
    const salesRepRole = await Role.findOne({ name: "Sales Representative" }).lean();
    if (!salesRepRole) {
      res.status(500).json({ message: "Sales representative role not configured" });
      return;
    }
    const hasSalesRepRole =
      Array.isArray(salesRep.roleIds) &&
      salesRep.roleIds.some(
        (rid: any) => rid?.toString() === salesRepRole._id.toString()
      );
    if (!hasSalesRepRole) {
      res.status(403).json({ message: "User is not a Sales Representative" });
      return;
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "At least one item is required" });
      return;
    }

    // Normalize and validate all items
    const normalizedItems: Array<{
      productId: Types.ObjectId;
      productCode: string;
      description?: string;
      quantity: number;
      price: number;
      discount: number;
      amount: number;
    }> = [];

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx] as IncomingReceiptItem;
      try {
        const normalized = await normalizeAndValidateItem(item, idx);
        normalizedItems.push(normalized);
      } catch (error: any) {
        res.status(400).json({ message: error.message });
        return;
      }
    }

    // Validate signature
    const signatureValidation = validateString(signature, {
      required: true,
      fieldName: "signature",
    });
    if (!signatureValidation.isValid) {
      res.status(400).json({ message: `signature: ${signatureValidation.error}` });
      return;
    }

    // Validate message (optional)
    const messageValidation = validateString(message, {
      required: false,
      maxLength: 1000,
    });
    if (!messageValidation.isValid) {
      res.status(400).json({ message: `message: ${messageValidation.error}` });
      return;
    }

    // Validate status
    const validStatuses = ["draft", "completed"];
    const receiptStatus = status && validStatuses.includes(status) ? status : "draft";
    
    // Validate print flag
    const shouldPrint = typeof print === "boolean" ? print : false;

    // If status is completed, print should be true (save and print)
    // If status is draft, print should be false (save draft)
    if (receiptStatus === "completed" && !shouldPrint) {
      res.status(400).json({
        message: "Print must be true when status is completed (save and print)",
      });
      return;
    }
    if (receiptStatus === "draft" && shouldPrint) {
      res.status(400).json({
        message: "Print must be false when status is draft (save draft)",
      });
      return;
    }

    // Calculate totals
    const totals = calculateReceiptTotals(normalizedItems);

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber();

    // Create receipt
    const receipt = await Receipt.create({
      receiptNumber,
      customerId: customerObjectId,
      salesRepId: salesRepObjectId,
      saleType: "cash",
      items: normalizedItems,
      message: messageValidation.value || undefined,
      signature: signatureValidation.value!,
      status: receiptStatus,
      print: shouldPrint,
      ...totals,
    });

    res.status(201).json({
      message: "Receipt created successfully",
      receipt: {
        id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        customerId: receipt.customerId,
        salesRepId: receipt.salesRepId,
        saleType: receipt.saleType,
        items: receipt.items,
        message: receipt.message,
        signature: receipt.signature,
        status: receipt.status,
        print: receipt.print,
        subtotalBeforeDiscount: receipt.subtotalBeforeDiscount,
        subtotalAfterDiscount: receipt.subtotalAfterDiscount,
        tax: receipt.tax,
        total: receipt.total,
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Create receipt error:", error);
    res.status(500).json({
      message: "Failed to create receipt",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get all receipts
 * GET /api/v1/receipt
 */
export const getReceipts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const receipts = await Receipt.find()
      .populate("customerId", "name email")
      .populate("salesRepId", "fullName email")
      .populate("invoiceId", "invoiceNumber")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    // Map receipts to include only required fields
    const mappedReceipts = receipts.map((receipt: any) => {
      const customer = receipt.customerId || {};
      const salesRep = receipt.salesRepId || {};
      const invoice = receipt.invoiceId || {};
      
      return {
        id: receipt._id?.toString() || receipt.id,
        receiptNumber: receipt.receiptNumber,
        customerName: customer.name || '',
        customerEmail: customer.email || '',
        receiptDate: receipt.createdAt || receipt.date || new Date(),
        receiptStatus: receipt.status || 'draft',
        salesRepName: salesRep.fullName || salesRep.name || '',
        saleType: receipt.saleType || 'cash',
        invoiceId: receipt.saleType === 'invoice' ? (invoice._id?.toString() || receipt.invoiceId?.toString()) : null,
        invoiceNumber: receipt.saleType === 'invoice' ? (invoice.invoiceNumber || '') : null,
        total: receipt.total || 0,
        subtotalAfterDiscount: receipt.subtotalAfterDiscount || 0,
        tax: receipt.tax || 0,
      };
    });

    const total = await Receipt.countDocuments();

    res.status(200).json({
      receipts: mappedReceipts,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error("Get receipts error:", error);
    res.status(500).json({
      message: "Failed to fetch receipts",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get receipt by ID
 * GET /api/v1/receipt/:id
 */
export const getReceiptById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { id } = req.params;

    const idValidation = validateObjectId(id, true);
    if (!idValidation.isValid) {
      res.status(400).json({ message: "Invalid receipt ID" });
      return;
    }

    const receipt = await Receipt.findById(id)
      .populate("customerId", "name email phone billingAddress shippingAddress customerCode")
      .populate("salesRepId", "fullName email")
      .populate("invoiceId", "invoiceNumber status total balanceDue")
      .populate("invoiceEditId", "depositAdded depositReceived createdAt")
      .lean();

    if (!receipt) {
      res.status(404).json({ message: "Receipt not found" });
      return;
    }

    // Format the response with only necessary data
    const customer = receipt.customerId as any;
    const salesRep = receipt.salesRepId as any;
    const invoice = receipt.invoiceId as any;
    const invoiceEdit = receipt.invoiceEditId as any;

    // Map items to only include fields needed by client
    const items = receipt.items.map((item: any) => ({
      productId: item.productId?.toString() || item.productId,
      productCode: item.productCode,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount,
      amount: item.amount,
    }));

    res.status(200).json({
      receipt: {
        id: receipt._id?.toString(),
        receiptNumber: receipt.receiptNumber,
        customer: customer ? {
          id: customer._id?.toString() || customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          customerCode: customer.customerCode,
          billingAddress: customer.billingAddress,
          shippingAddress: customer.shippingAddress,
        } : null,
        salesRep: salesRep ? {
          id: salesRep._id?.toString() || salesRep.id,
          fullName: salesRep.fullName,
          email: salesRep.email,
        } : null,
        saleType: receipt.saleType,
        invoice: invoice ? {
          id: invoice._id?.toString() || invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          total: invoice.total,
          balanceDue: invoice.balanceDue,
        } : null,
        invoiceEditId: receipt.invoiceEditId?.toString() || null,
        invoiceEdit: invoiceEdit ? {
          id: invoiceEdit._id?.toString() || invoiceEdit.id,
          depositAdded: Number(invoiceEdit.depositAdded ?? 0),
          depositReceived: Number(invoiceEdit.depositReceived ?? 0),
          createdAt: invoiceEdit.createdAt,
        } : null,
        items,
        message: receipt.message,
        signature: receipt.signature,
        status: receipt.status,
        print: receipt.print,
        deposit: receipt.deposit || 0,
        subtotalBeforeDiscount: receipt.subtotalBeforeDiscount,
        subtotalAfterDiscount: receipt.subtotalAfterDiscount,
        tax: receipt.tax,
        total: receipt.total,
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Get receipt by ID error:", error);
    res.status(500).json({
      message: "Failed to fetch receipt",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Generate receipt from invoice edit
 * POST /api/v1/receipt/generate-from-invoice
 */
export const generateReceiptFromInvoice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { invoiceId, editId, signature } = req.body || {};

    // Validate invoiceId
    const invoiceIdValidation = validateObjectId(invoiceId, true);
    if (!invoiceIdValidation.isValid) {
      res.status(400).json({ message: `invoiceId: ${invoiceIdValidation.error}` });
      return;
    }

    const invoiceObjectId = new Types.ObjectId(invoiceIdValidation.value!);
    const invoice = await Invoice.findById(invoiceObjectId)
      .populate("customerId")
      .populate("salesRep")
      .lean();

    if (!invoice) {
      res.status(404).json({ message: "Invoice not found" });
      return;
    }

    // editId is required - receipt must be generated from a specific invoice edit
    if (!editId) {
      res.status(400).json({ message: "editId is required. Receipt must be generated from a specific invoice edit." });
      return;
    }

    const editIdValidation = validateObjectId(editId, true);
    if (!editIdValidation.isValid) {
      res.status(400).json({ message: `editId: ${editIdValidation.error}` });
      return;
    }

    const invoiceEditObjectId = new Types.ObjectId(editIdValidation.value!);
    const invoiceEdit = await InvoiceEdit.findById(invoiceEditObjectId).lean();
    
    if (!invoiceEdit) {
      res.status(404).json({ message: "Invoice edit not found" });
      return;
    }

    // Verify edit belongs to this invoice
    if (invoiceEdit.baseInvoiceId?.toString() !== invoiceObjectId.toString()) {
      res.status(400).json({ message: "Invoice edit does not belong to this invoice" });
      return;
    }

    // Validation: Receipt can only be generated if depositAdded > 0
    // Use depositAdded (deposit from this specific edit) not depositReceived (total from base invoice)
    const depositAdded = Number(invoiceEdit.depositAdded ?? 0);
    if (depositAdded <= 0) {
      res.status(400).json({ message: "Receipt cannot be generated with zero deposit." });
      return;
    }

    // Idempotency check: Check if a receipt already exists for this invoice edit
    // Uniqueness is based on (invoiceId + invoiceEditId) combination
    // The same invoice can have multiple receipts if it has multiple edits
    const existingReceipt = await Receipt.findOne({ 
      invoiceId: invoiceObjectId,
      invoiceEditId: invoiceEditObjectId
    }).lean();

    if (existingReceipt) {
      res.status(200).json({
        message: `Receipt already generated for this invoice edit. Receipt Number: ${existingReceipt.receiptNumber}`,
        receipt: {
          id: existingReceipt._id?.toString(),
          receiptNumber: existingReceipt.receiptNumber,
          invoiceId: existingReceipt.invoiceId?.toString(),
          invoiceEditId: existingReceipt.invoiceEditId?.toString(),
        },
        alreadyExists: true,
      });
      return;
    }

    // Use items from invoice edit (required)
    const sourceItems = invoiceEdit.items || [];
    if (!Array.isArray(sourceItems) || sourceItems.length === 0) {
      res.status(400).json({ message: "Invoice edit has no items to generate receipt from" });
      return;
    }

    // Validate customer from invoice edit
    const customerId = invoiceEdit.customerId as any;
    if (!customerId) {
      res.status(400).json({ message: "Invoice edit has no customer" });
      return;
    }
    const customerObjectId = customerId instanceof Types.ObjectId 
      ? customerId 
      : new Types.ObjectId(String(customerId));

    const customer = await Customer.findById(customerObjectId).lean();
    if (!customer) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }

    // Validate sales rep from invoice edit
    const salesRepId = invoiceEdit.salesRep as any;
    if (!salesRepId) {
      res.status(400).json({ message: "Invoice edit has no sales representative" });
      return;
    }
    const salesRepObjectId = salesRepId instanceof Types.ObjectId
      ? salesRepId
      : new Types.ObjectId(String(salesRepId));

    const salesRep = await User.findById(salesRepObjectId).lean();
    if (!salesRep) {
      res.status(404).json({ message: "Sales representative not found" });
      return;
    }

    // Verify sales rep role
    const salesRepRole = await Role.findOne({ name: "Sales Representative" }).lean();
    if (!salesRepRole) {
      res.status(500).json({ message: "Sales representative role not configured" });
      return;
    }
    const hasSalesRepRole =
      Array.isArray(salesRep.roleIds) &&
      salesRep.roleIds.some(
        (rid: any) => rid?.toString() === salesRepRole._id.toString()
      );
    if (!hasSalesRepRole) {
      res.status(403).json({ message: "User is not a Sales Representative" });
      return;
    }

    // Validate signature (use invoice edit signature if not provided, but signature is required)
    let receiptSignature: string;
    if (signature) {
      const signatureValidation = validateString(signature, {
        required: true,
        fieldName: "signature",
      });
      if (!signatureValidation.isValid) {
        res.status(400).json({ message: `signature: ${signatureValidation.error}` });
        return;
      }
      receiptSignature = signatureValidation.value!;
    } else if (invoiceEdit.signature) {
      receiptSignature = invoiceEdit.signature;
    } else if (invoice.signature) {
      receiptSignature = invoice.signature;
    } else {
      res.status(400).json({ message: "Signature is required. Invoice edit and invoice have no signature." });
      return;
    }

    // Convert invoice/edit items to receipt items
    // Invoice items have: productCode, description, quantity, discount, amount
    // Receipt items need: productId, productCode, description, quantity, price, discount, amount
    const receiptItems: Array<{
      productId: Types.ObjectId;
      productCode: string;
      description?: string;
      quantity: number;
      price: number;
      discount: number;
      amount: number;
    }> = [];

    for (let idx = 0; idx < sourceItems.length; idx++) {
      const item = sourceItems[idx] as any;
      const productCode = item.productCode?.trim() || '';
      const description = item.description?.trim() || '';
      const quantity = Number(item.quantity ?? 0);
      const discount = Number(item.discount ?? 0);
      const amount = Number(item.amount ?? 0);

      if (!productCode) {
        res.status(400).json({ message: `Item ${idx + 1}: productCode is required` });
        return;
      }
      if (quantity <= 0) {
        res.status(400).json({ message: `Item ${idx + 1}: quantity must be > 0` });
        return;
      }
      if (amount < 0) {
        res.status(400).json({ message: `Item ${idx + 1}: amount must be >= 0` });
        return;
      }
      if (discount < 0 || discount > 100) {
        res.status(400).json({ message: `Item ${idx + 1}: discount must be between 0 and 100` });
        return;
      }

      // Calculate price from amount, quantity, and discount
      // amount = quantity * price * (1 - discount/100)
      // price = amount / (quantity * (1 - discount/100))
      const discountFactor = 1 - discount / 100;
      const price = discountFactor > 0 && quantity > 0
        ? Number((amount / (quantity * discountFactor)).toFixed(2))
        : 0;

      // Generate dummy productId (product validation removed)
      const productId = new Types.ObjectId();

      receiptItems.push({
        productId,
        productCode,
        description: description || undefined,
        quantity,
        price,
        discount,
        amount,
      });
    }

    // Use totals from invoice edit (reflects the exact state at time of edit)
    // Calculate receipt totals from items for validation, but use invoice edit totals
    const calculatedTotals = calculateReceiptTotals(receiptItems);
    
    // Use invoice edit totals (these reflect the actual invoice state at time of edit)
    // The receipt should match the invoice edit's financial state exactly
    const receiptTotals = {
      subtotalBeforeDiscount: invoiceEdit.total || calculatedTotals.subtotalBeforeDiscount,
      subtotalAfterDiscount: invoiceEdit.total || calculatedTotals.subtotalAfterDiscount,
      tax: invoiceEdit.total ? Number((invoiceEdit.total * 0.125 / 1.125).toFixed(2)) : calculatedTotals.tax,
      total: invoiceEdit.total || calculatedTotals.total,
    };

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber();

    // Get deposit amount from current invoice edit only (depositAdded, not total depositReceived)
    // depositAdded is the deposit for this specific edit, not the cumulative total
    const depositAmount = Number(invoiceEdit.depositAdded ?? 0);

    // Build message including deposit information if applicable
    let receiptMessage = invoiceEdit.message || invoice.message || undefined;
    if (depositAmount > 0) {
      const depositInfo = `Deposit received: ${depositAmount.toFixed(2)}`;
      receiptMessage = receiptMessage 
        ? `${receiptMessage}\n${depositInfo}` 
        : depositInfo;
    }

    // Create receipt with saleType: 'invoice', linked to invoice and invoice edit
    // Note: Idempotency is already checked above, but we catch database constraint violations
    // as a safety net for race conditions
    let receipt;
    try {
      receipt = await Receipt.create({
        receiptNumber,
        customerId: customerObjectId,
        salesRepId: salesRepObjectId,
        saleType: "invoice",
        invoiceId: invoiceObjectId,
        invoiceEditId: invoiceEditObjectId, // Store reference to the invoice edit used
        items: receiptItems,
        message: receiptMessage,
        signature: receiptSignature,
        status: "completed", // Receipts from invoices are always completed
        print: true, // Receipts from invoices should be printed
        deposit: depositAmount, // Store deposit amount from invoice edit
        ...receiptTotals,
      });
    } catch (createError: any) {
      // Handle database unique constraint violation (backup check)
      if (createError.code === 11000 || createError.name === 'MongoServerError') {
        // Duplicate key error - check if it's our compound index
        const existingReceipt = await Receipt.findOne({
          invoiceId: invoiceObjectId,
          invoiceEditId: invoiceEditObjectId
        }).lean();

        if (existingReceipt) {
          res.status(200).json({
            message: `Receipt already generated for this invoice edit. Receipt Number: ${existingReceipt.receiptNumber}`,
            receipt: {
              id: existingReceipt._id?.toString(),
              receiptNumber: existingReceipt.receiptNumber,
              invoiceId: existingReceipt.invoiceId?.toString(),
              invoiceEditId: existingReceipt.invoiceEditId?.toString(),
            },
            alreadyExists: true,
          });
          return;
        }
      }
      // Re-throw if it's not a duplicate key error
      throw createError;
    }

    res.status(201).json({
      message: "Receipt generated successfully from invoice",
      receipt: {
        id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        customerId: receipt.customerId,
        salesRepId: receipt.salesRepId,
        saleType: receipt.saleType,
        invoiceId: receipt.invoiceId,
        invoiceEditId: receipt.invoiceEditId,
        items: receipt.items,
        message: receipt.message,
        signature: receipt.signature,
        status: receipt.status,
        print: receipt.print,
        deposit: receipt.deposit,
        subtotalBeforeDiscount: receipt.subtotalBeforeDiscount,
        subtotalAfterDiscount: receipt.subtotalAfterDiscount,
        tax: receipt.tax,
        total: receipt.total,
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Generate receipt from invoice error:", error);
    res.status(500).json({
      message: "Failed to generate receipt from invoice",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
