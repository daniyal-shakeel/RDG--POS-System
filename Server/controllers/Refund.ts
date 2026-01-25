import { Response } from "express";
import { Types } from "mongoose";
import { randomUUID } from "crypto";
import { AuthRequest } from "../middleware/auth";
import Refund from "../models/Refund";
import CreditNote from "../models/CreditNote";
import Customer from "../models/Customer";
import User from "../models/User";
import Role from "../models/Role";
import {
  validateString,
} from "../utils/validation";

type IncomingProduct = {
  productCode?: string;
  description?: string;
  quantity?: number;
  price?: number;
};

/**
 * Generate unique refund number in format REF-XXXX-XXXX
 */
const generateRefundNumber = async (): Promise<string> => {
  let attempts = 0;
  while (attempts < 5) {
    const raw = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const refundNumber = `REF-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    const exists = await Refund.findOne({ refundNumber }).lean();
    if (!exists) {
      return refundNumber;
    }
    attempts += 1;
  }
  throw new Error("Unable to generate unique refund number");
};

/**
 * Validate and normalize refund product
 */
const normalizeAndValidateProduct = (
  product: IncomingProduct,
  index: number
): {
  productCode: string;
  description?: string;
  quantity: number;
  price: number;
} => {
  const errors: string[] = [];

  // Validate productCode (required)
  const productCodeValidation = validateString(product.productCode, {
    required: true,
    fieldName: "productCode",
  });
  if (!productCodeValidation.isValid) {
    errors.push(`Product ${index + 1}: ${productCodeValidation.error}`);
  }

  // Validate quantity (required, must be > 0)
  const quantity = Number(product.quantity ?? 0);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.push(`Product ${index + 1}: quantity must be a positive number`);
  }

  // Validate price (required, must be >= 0)
  const price = Number(product.price ?? 0);
  if (!Number.isFinite(price) || price < 0) {
    errors.push(`Product ${index + 1}: price must be a non-negative number`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return {
    productCode: (product.productCode || "").trim(),
    description: product.description ? (product.description || "").trim() : undefined,
    quantity: Number(quantity.toFixed(2)),
    price: Number(price.toFixed(2)),
  };
};

/**
 * Create a new refund
 */
export const createRefund = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      customerId,
      salesRepId,
      source,
      creditNoteId,
      products,
      message,
      salesRepSignature,
      saveDraft = false,
    } = req.body || {};

    // Validate source
    if (!source || (source !== 'FROM_CREDITNOTE' && source !== 'STANDALONE')) {
      return res.status(400).json({ message: "source must be either 'FROM_CREDITNOTE' or 'STANDALONE'" });
    }

    // Validate creditNoteId if source is FROM_CREDITNOTE
    if (source === 'FROM_CREDITNOTE') {
      if (!creditNoteId || !Types.ObjectId.isValid(creditNoteId)) {
        return res.status(400).json({ message: "Valid creditNoteId is required when source is FROM_CREDITNOTE" });
      }
      const creditNote = await CreditNote.findById(new Types.ObjectId(creditNoteId)).lean();
      if (!creditNote) {
        return res.status(404).json({ message: "Credit note not found" });
      }
    }

    // Validate customerId
    if (!customerId || !Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Valid customerId is required" });
    }

    const customer = await Customer.findById(new Types.ObjectId(customerId)).lean();
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Validate salesRepId
    if (!salesRepId || !Types.ObjectId.isValid(salesRepId)) {
      return res.status(400).json({ message: "Valid salesRepId is required" });
    }

    const salesRep = await User.findById(new Types.ObjectId(salesRepId)).lean();
    if (!salesRep) {
      return res.status(404).json({ message: "Sales representative not found" });
    }

    // Verify sales rep has Sales Representative role
    const salesRepRole = await Role.findOne({ name: "Sales Representative" }).lean();
    if (!salesRepRole) {
      return res.status(500).json({ message: "Sales representative role not configured" });
    }

    const hasSalesRepRole =
      Array.isArray(salesRep.roleIds) &&
      salesRep.roleIds.some(
        (rid: any) => rid?.toString() === salesRepRole._id.toString()
      );
    if (!hasSalesRepRole) {
      return res.status(403).json({ message: "User is not a Sales Representative" });
    }

    // Validate products
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "At least one product is required" });
    }

    // Normalize and validate all products
    const normalizedProducts = [];
    for (let idx = 0; idx < products.length; idx++) {
      const product = products[idx] as IncomingProduct;
      try {
        const normalized = normalizeAndValidateProduct(product, idx);
        normalizedProducts.push(normalized);
      } catch (error: any) {
        return res.status(400).json({
          message: error.message || "Invalid product data",
        });
      }
    }

    // Validate signature
    if (!salesRepSignature || typeof salesRepSignature !== "string" || salesRepSignature.trim().length === 0) {
      return res.status(400).json({ message: "salesRepSignature is required" });
    }

    // Generate refund number
    const refundNumber = await generateRefundNumber();

    // Determine status based on saveDraft flag
    const status = saveDraft === true ? "DRAFT" : "REFUNDED";

    // Create refund
    const refund = await Refund.create({
      refundNumber,
      source,
      customerId: new Types.ObjectId(customerId),
      salesRepId: new Types.ObjectId(salesRepId),
      creditNoteId: source === 'FROM_CREDITNOTE' && creditNoteId ? new Types.ObjectId(creditNoteId) : undefined,
      products: normalizedProducts,
      message: message ? (message || "").trim() : undefined,
      salesRepSignature: (salesRepSignature || "").trim(),
      status,
    });

    return res.status(201).json({
      message: "Refund created successfully",
      refund: {
        ...refund.toObject(),
      },
    });
  } catch (error: any) {
    console.error("Create refund error:", error);
    
    // Handle duplicate key error (refundNumber uniqueness)
    if (error.code === 11000 || error.name === "MongoServerError") {
      return res.status(409).json({
        message: "Refund number already exists. Please try again.",
      });
    }

    return res.status(500).json({
      message: "Error creating refund",
      errorMessage: error?.message,
    });
  }
};

/**
 * Get all refunds with pagination
 */
export const getRefunds = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const statusFilter = req.query.status as string | undefined;

    // Build query
    const query: any = {};
    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter.toUpperCase();
    }

    const [refunds, total] = await Promise.all([
      Refund.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate("customerId", "name email phone billingAddress shippingAddress")
        .populate("salesRepId", "fullName email")
        .populate("creditNoteId", "creditNoteNumber")
        .lean(),
      Refund.countDocuments(query),
    ]);

    // Map refunds to response format
    const mapped = refunds.map((ref: any) => {
      const customer = ref.customerId || {};
      const salesRep = ref.salesRepId || {};
      const creditNote = ref.creditNoteId || {};

      return {
        id: ref._id,
        refundNumber: ref.refundNumber,
        source: ref.source,
        creditNoteId: creditNote._id || ref.creditNoteId,
        creditNoteNumber: creditNote.creditNoteNumber || null,
        customer: customer.name || customer.email || "",
        customerId: customer._id || ref.customerId,
        date: ref.createdAt,
        status: ref.status,
        salesRep: salesRep.fullName || salesRep.email || "",
        products: ref.products || [],
        message: ref.message,
        createdAt: ref.createdAt,
        updatedAt: ref.updatedAt,
      };
    });

    return res.status(200).json({
      message: "Refunds fetched successfully",
      refunds: mapped,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error("Get refunds error:", error);
    return res.status(500).json({
      message: "Error fetching refunds",
      errorMessage: error?.message,
    });
  }
};

/**
 * Get refund by ID
 */
export const getRefundById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid refund id" });
    }

    const refund = await Refund.findById(new Types.ObjectId(id))
      .populate("customerId", "name email phone billingAddress shippingAddress")
      .populate("salesRepId", "fullName email")
      .populate("creditNoteId", "creditNoteNumber")
      .lean();

    if (!refund) {
      return res.status(404).json({ message: "Refund not found" });
    }

    const customerData = refund.customerId as any;
    const salesRepData = refund.salesRepId as any;
    const creditNoteData = refund.creditNoteId as any;

    const responseRefund = {
      id: refund._id,
      refundNumber: refund.refundNumber,
      source: refund.source,
      customerId: customerData?._id || refund.customerId,
      customerName: customerData?.name || customerData?.email || "",
      customerEmail: customerData?.email || "",
      customerPhone: customerData?.phone || "",
      customerBillingAddress: customerData?.billingAddress || "",
      customerShippingAddress: customerData?.shippingAddress || "",
      salesRepId: salesRepData?._id || refund.salesRepId,
      salesRepName: salesRepData?.fullName || salesRepData?.email || "",
      creditNoteId: creditNoteData?._id || refund.creditNoteId,
      creditNoteNumber: creditNoteData?.creditNoteNumber || null,
      products: refund.products || [],
      message: refund.message,
      salesRepSignature: refund.salesRepSignature,
      status: refund.status,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
    };

    return res.status(200).json({
      message: "Refund fetched successfully",
      refund: responseRefund,
    });
  } catch (error: any) {
    console.error("Get refund error:", error);
    return res.status(500).json({
      message: "Error fetching refund",
      errorMessage: error?.message,
    });
  }
};

/**
 * Update a refund (only allowed for DRAFT status)
 */
export const updateRefund = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid refund id" });
    }

    // Find the refund first to check its status
    const existingRefund = await Refund.findById(new Types.ObjectId(id)).lean();
    if (!existingRefund) {
      return res.status(404).json({ message: "Refund not found" });
    }

    // Prevent editing REFUNDED refunds
    if (existingRefund.status === "REFUNDED") {
      return res.status(403).json({
        message: "Refunded refunds cannot be edited",
      });
    }

    // Only DRAFT refunds can be edited
    if (existingRefund.status !== "DRAFT") {
      return res.status(400).json({
        message: `Refunds with status ${existingRefund.status} cannot be edited`,
      });
    }

    const {
      customerId,
      salesRepId,
      source,
      creditNoteId,
      products,
      message,
      salesRepSignature,
      saveDraft = false,
    } = req.body || {};

    // Validate source if provided
    if (source !== undefined) {
      if (source !== 'FROM_CREDITNOTE' && source !== 'STANDALONE') {
        return res.status(400).json({ message: "source must be either 'FROM_CREDITNOTE' or 'STANDALONE'" });
      }
    }

    // Validate creditNoteId if source is FROM_CREDITNOTE
    const finalSource = source || existingRefund.source;
    if (finalSource === 'FROM_CREDITNOTE') {
      const finalCreditNoteId = creditNoteId || existingRefund.creditNoteId;
      if (!finalCreditNoteId || !Types.ObjectId.isValid(finalCreditNoteId)) {
        return res.status(400).json({ message: "Valid creditNoteId is required when source is FROM_CREDITNOTE" });
      }
      const creditNote = await CreditNote.findById(new Types.ObjectId(finalCreditNoteId)).lean();
      if (!creditNote) {
        return res.status(404).json({ message: "Credit note not found" });
      }
    }

    // Validate customerId if provided
    if (customerId) {
      if (!Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({ message: "Valid customerId is required" });
      }
      const customer = await Customer.findById(new Types.ObjectId(customerId)).lean();
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
    }

    // Validate salesRepId if provided
    if (salesRepId) {
      if (!Types.ObjectId.isValid(salesRepId)) {
        return res.status(400).json({ message: "Valid salesRepId is required" });
      }
      const salesRep = await User.findById(new Types.ObjectId(salesRepId)).lean();
      if (!salesRep) {
        return res.status(404).json({ message: "Sales representative not found" });
      }

      // Verify sales rep has Sales Representative role
      const salesRepRole = await Role.findOne({ name: "Sales Representative" }).lean();
      if (!salesRepRole) {
        return res.status(500).json({ message: "Sales representative role not configured" });
      }

      const hasSalesRepRole =
        Array.isArray(salesRep.roleIds) &&
        salesRep.roleIds.some(
          (rid: any) => rid?.toString() === salesRepRole._id.toString()
        );
      if (!hasSalesRepRole) {
        return res.status(403).json({ message: "User is not a Sales Representative" });
      }
    }

    // Build update object
    const updateData: any = {};

    if (products !== undefined) {
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: "At least one product is required" });
      }

      // Normalize and validate all products
      const normalizedProducts = [];
      for (let idx = 0; idx < products.length; idx++) {
        const product = products[idx] as IncomingProduct;
        try {
          const normalized = normalizeAndValidateProduct(product, idx);
          normalizedProducts.push(normalized);
        } catch (error: any) {
          return res.status(400).json({
            message: error.message || "Invalid product data",
          });
        }
      }
      updateData.products = normalizedProducts;
    }

    if (customerId !== undefined) {
      updateData.customerId = new Types.ObjectId(customerId);
    }

    if (salesRepId !== undefined) {
      updateData.salesRepId = new Types.ObjectId(salesRepId);
    }

    if (source !== undefined) {
      updateData.source = source;
    }

    if (creditNoteId !== undefined) {
      if (finalSource === 'FROM_CREDITNOTE') {
        updateData.creditNoteId = new Types.ObjectId(creditNoteId);
      } else {
        updateData.creditNoteId = undefined;
      }
    }

    if (message !== undefined) {
      updateData.message = message ? (message || "").trim() : undefined;
    }

    if (salesRepSignature !== undefined) {
      if (!salesRepSignature || typeof salesRepSignature !== "string" || salesRepSignature.trim().length === 0) {
        return res.status(400).json({ message: "salesRepSignature is required" });
      }
      updateData.salesRepSignature = (salesRepSignature || "").trim();
    }

    // Determine status based on saveDraft flag
    if (saveDraft === true) {
      updateData.status = "DRAFT";
    } else if (saveDraft === false) {
      updateData.status = "REFUNDED";
    }

    // Update the refund
    const updatedRefund = await Refund.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("customerId", "name email phone billingAddress shippingAddress")
      .populate("salesRepId", "fullName email")
      .populate("creditNoteId", "creditNoteNumber")
      .lean();

    if (!updatedRefund) {
      return res.status(404).json({ message: "Refund not found after update" });
    }

    const customerData = updatedRefund.customerId as any;
    const salesRepData = updatedRefund.salesRepId as any;
    const creditNoteData = updatedRefund.creditNoteId as any;

    const responseRefund = {
      id: updatedRefund._id,
      refundNumber: updatedRefund.refundNumber,
      source: updatedRefund.source,
      customerId: customerData?._id || updatedRefund.customerId,
      customerName: customerData?.name || customerData?.email || "",
      customerEmail: customerData?.email || "",
      customerPhone: customerData?.phone || "",
      customerBillingAddress: customerData?.billingAddress || "",
      customerShippingAddress: customerData?.shippingAddress || "",
      salesRepId: salesRepData?._id || updatedRefund.salesRepId,
      salesRepName: salesRepData?.fullName || salesRepData?.email || "",
      creditNoteId: creditNoteData?._id || updatedRefund.creditNoteId,
      creditNoteNumber: creditNoteData?.creditNoteNumber || null,
      products: updatedRefund.products || [],
      message: updatedRefund.message,
      salesRepSignature: updatedRefund.salesRepSignature,
      status: updatedRefund.status,
      createdAt: updatedRefund.createdAt,
      updatedAt: updatedRefund.updatedAt,
    };

    return res.status(200).json({
      message: "Refund updated successfully",
      refund: responseRefund,
    });
  } catch (error: any) {
    console.error("Update refund error:", error);
    return res.status(500).json({
      message: "Error updating refund",
      errorMessage: error?.message,
    });
  }
};
