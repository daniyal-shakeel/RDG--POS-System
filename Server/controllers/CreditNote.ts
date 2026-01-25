import { Response } from "express";
import { Types } from "mongoose";
import { randomUUID } from "crypto";
import { AuthRequest } from "../middleware/auth";
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
 * Generate unique credit note number in format CN-XXXX-XXXX
 */
const generateCreditNoteNumber = async (): Promise<string> => {
  let attempts = 0;
  while (attempts < 5) {
    const raw = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const creditNoteNumber = `CN-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    const exists = await CreditNote.findOne({ creditNoteNumber }).lean();
    if (!exists) {
      return creditNoteNumber;
    }
    attempts += 1;
  }
  throw new Error("Unable to generate unique credit note number");
};

/**
 * Validate and normalize credit note product
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
 * Create a new credit note
 */
export const createCreditNote = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      customerId,
      salesRepId,
      products,
      message,
      salesRepSignature,
      saveDraft = false,
    } = req.body || {};

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

    // Generate credit note number
    const creditNoteNumber = await generateCreditNoteNumber();

    // Determine status based on saveDraft flag
    const status = saveDraft === true ? "DRAFT" : "APPROVED";

    // Create credit note
    const creditNote = await CreditNote.create({
      creditNoteNumber,
      source: "STANDALONE", // For now, only standalone credit notes
      customerId: new Types.ObjectId(customerId),
      salesRepId: new Types.ObjectId(salesRepId),
      products: normalizedProducts,
      message: message ? (message || "").trim() : undefined,
      salesRepSignature: (salesRepSignature || "").trim(),
      status,
    });

    return res.status(201).json({
      message: "Credit note created successfully",
      creditNote: {
        ...creditNote.toObject(),
      },
    });
  } catch (error: any) {
    console.error("Create credit note error:", error);
    
    // Handle duplicate key error (creditNoteNumber uniqueness)
    if (error.code === 11000 || error.name === "MongoServerError") {
      return res.status(409).json({
        message: "Credit note number already exists. Please try again.",
      });
    }

    return res.status(500).json({
      message: "Error creating credit note",
      errorMessage: error?.message,
    });
  }
};

/**
 * Get all credit notes with pagination
 */
export const getCreditNotes = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const statusFilter = req.query.status as string | undefined;

    // Build query
    const query: any = {};
    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter.toUpperCase();
    }

    const [creditNotes, total] = await Promise.all([
      CreditNote.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate("customerId", "name email phone billingAddress shippingAddress")
        .populate("salesRepId", "fullName email")
        .lean(),
      CreditNote.countDocuments(query),
    ]);

    // Map credit notes to response format
    const mapped = creditNotes.map((cn: any) => {
      const customer = cn.customerId || {};
      const salesRep = cn.salesRepId || {};

      return {
        id: cn._id,
        creditNoteNumber: cn.creditNoteNumber,
        source: cn.source,
        customer: customer.name || customer.email || "",
        customerId: customer._id || cn.customerId,
        date: cn.createdAt,
        status: cn.status,
        salesRep: salesRep.fullName || salesRep.email || "",
        products: cn.products || [],
        message: cn.message,
        createdAt: cn.createdAt,
        updatedAt: cn.updatedAt,
      };
    });

    return res.status(200).json({
      message: "Credit notes fetched successfully",
      creditNotes: mapped,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error("Get credit notes error:", error);
    return res.status(500).json({
      message: "Error fetching credit notes",
      errorMessage: error?.message,
    });
  }
};

/**
 * Get credit note by ID
 */
export const getCreditNoteById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid credit note id" });
    }

    const creditNote = await CreditNote.findById(new Types.ObjectId(id))
      .populate("customerId", "name email phone billingAddress shippingAddress")
      .populate("salesRepId", "fullName email")
      .lean();

    if (!creditNote) {
      return res.status(404).json({ message: "Credit note not found" });
    }

    const customerData = creditNote.customerId as any;
    const salesRepData = creditNote.salesRepId as any;

    const responseCreditNote = {
      id: creditNote._id,
      creditNoteNumber: creditNote.creditNoteNumber,
      source: creditNote.source,
      customerId: customerData?._id || creditNote.customerId,
      customerName: customerData?.name || customerData?.email || "",
      customerEmail: customerData?.email || "",
      customerPhone: customerData?.phone || "",
      customerBillingAddress: customerData?.billingAddress || "",
      customerShippingAddress: customerData?.shippingAddress || "",
      salesRepId: salesRepData?._id || creditNote.salesRepId,
      salesRepName: salesRepData?.fullName || salesRepData?.email || "",
      products: creditNote.products || [],
      message: creditNote.message,
      salesRepSignature: creditNote.salesRepSignature,
      status: creditNote.status,
      createdAt: creditNote.createdAt,
      updatedAt: creditNote.updatedAt,
    };

    return res.status(200).json({
      message: "Credit note fetched successfully",
      creditNote: responseCreditNote,
    });
  } catch (error: any) {
    console.error("Get credit note error:", error);
    return res.status(500).json({
      message: "Error fetching credit note",
      errorMessage: error?.message,
    });
  }
};

/**
 * Update a credit note (only allowed for DRAFT status)
 */
export const updateCreditNote = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid credit note id" });
    }

    // Find the credit note first to check its status
    const existingCreditNote = await CreditNote.findById(new Types.ObjectId(id)).lean();
    if (!existingCreditNote) {
      return res.status(404).json({ message: "Credit note not found" });
    }

    // Prevent editing APPROVED credit notes
    if (existingCreditNote.status === "APPROVED") {
      return res.status(403).json({
        message: "Approved credit notes cannot be edited",
      });
    }

    // Only DRAFT credit notes can be edited
    if (existingCreditNote.status !== "DRAFT") {
      return res.status(400).json({
        message: `Credit notes with status ${existingCreditNote.status} cannot be edited`,
      });
    }

    const {
      customerId,
      salesRepId,
      products,
      message,
      salesRepSignature,
      saveDraft = false,
    } = req.body || {};

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
      updateData.status = "APPROVED";
    }

    // Update the credit note
    const updatedCreditNote = await CreditNote.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("customerId", "name email phone billingAddress shippingAddress")
      .populate("salesRepId", "fullName email")
      .lean();

    if (!updatedCreditNote) {
      return res.status(404).json({ message: "Credit note not found after update" });
    }

    const customerData = updatedCreditNote.customerId as any;
    const salesRepData = updatedCreditNote.salesRepId as any;

    const responseCreditNote = {
      id: updatedCreditNote._id,
      creditNoteNumber: updatedCreditNote.creditNoteNumber,
      source: updatedCreditNote.source,
      customerId: customerData?._id || updatedCreditNote.customerId,
      customerName: customerData?.name || customerData?.email || "",
      customerEmail: customerData?.email || "",
      customerPhone: customerData?.phone || "",
      customerBillingAddress: customerData?.billingAddress || "",
      customerShippingAddress: customerData?.shippingAddress || "",
      salesRepId: salesRepData?._id || updatedCreditNote.salesRepId,
      salesRepName: salesRepData?.fullName || salesRepData?.email || "",
      products: updatedCreditNote.products || [],
      message: updatedCreditNote.message,
      salesRepSignature: updatedCreditNote.salesRepSignature,
      status: updatedCreditNote.status,
      createdAt: updatedCreditNote.createdAt,
      updatedAt: updatedCreditNote.updatedAt,
    };

    return res.status(200).json({
      message: "Credit note updated successfully",
      creditNote: responseCreditNote,
    });
  } catch (error: any) {
    console.error("Update credit note error:", error);
    return res.status(500).json({
      message: "Error updating credit note",
      errorMessage: error?.message,
    });
  }
};
