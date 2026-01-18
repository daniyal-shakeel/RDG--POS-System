import { Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../middleware/auth";
import Estimate from "../models/Estimate";
import Customer from "../models/Customer";
import User from "../models/User";
import { validateObjectId, validateString } from "../utils/validation";


const createEstimate = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};
    
    const customerIdValidation = validateObjectId(body?.customerId ?? "", true);
    if (!customerIdValidation.isValid) {
      return res.status(400).json({
        message: customerIdValidation.error || "Customer is required",
      });
    }
    const customer = await Customer.findById(customerIdValidation.value).lean();
    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return res.status(400).json({
        message: "At least one line item is required",
      });
    }

    const normalizedItems = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index] || {};
      const qty = Number(item.quantity ?? item.qty);
      const unitPrice = Number(item.unitPrice ?? item.price ?? item.unit_price);
      const discount = Number(item.discount ?? 0);
      const descriptionValidation = validateString(item.description ?? item.name ?? "", {
        required: true,
        maxLength: 500,
        checkMalicious: true,
      });
      const productCodeValidation = validateString(item.productCode ?? "", {
        required: true,
        maxLength: 100,
        checkMalicious: true,
      });
      if (!descriptionValidation.isValid) {
        return res.status(400).json({
          message: `Invalid item name for item ${index + 1}`,
        });
      }
      if (!productCodeValidation.isValid) {
        return res.status(400).json({
          message: `Invalid product code for item ${index + 1}`,
        });
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({
          message: `Quantity must be greater than 0 for item ${index + 1}`,
        });
      }
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return res.status(400).json({
          message: `Unit price must be greater than 0 for item ${index + 1}`,
        });
      }
      if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({
          message: `Discount must be between 0 and 100 for item ${index + 1}`,
        });
      }
      const amount = Number((qty * unitPrice * (1 - discount / 100)).toFixed(2));
      normalizedItems.push({
        productCode: productCodeValidation.value || undefined,
        description: descriptionValidation.value || undefined,
        quantity: qty,
        discount,
        amount,
      });
    }

    const statusInput = typeof body?.status === "string" ? body.status.trim() : "draft";
    const status =
      statusInput === "pending" || statusInput === "draft" ? statusInput : "draft";

    const messageValidation = validateString(body?.message ?? "", {
      required: true,
      maxLength: 2000,
      checkMalicious: true,
    });
    if (!messageValidation.isValid) {
      return res.status(400).json({
        message: messageValidation.error || "Invalid message",
      });
    }

    const signatureValidation = validateString(body?.signature ?? "", {
      required: true,
      maxLength: 200000,
      checkMalicious: true,
    });
    if (!signatureValidation.isValid) {
      return res.status(400).json({
        message: signatureValidation.error || "Invalid signature",
      });
    }

    const salesRepValidation = validateObjectId(body?.salesRep ?? "", true);
    if (!salesRepValidation.isValid) {
      return res.status(400).json({
        message: salesRepValidation.error || "Sales representative is required",
      });
    }
    const salesRep = await User.findById(salesRepValidation.value).lean();
    if (!salesRep) {
      return res.status(404).json({
        message: "Sales representative not found",
      });
    }

    const message = messageValidation.value || undefined;
    const signature = signatureValidation.value || undefined;
    const print = Boolean(body?.print);

    const total = Number(
      normalizedItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
    );

    let reference = `EST-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2, 6)
      .toUpperCase()}`;
      let existing = await Estimate.findOne({ reference }).lean();
      let attempts = 0;
    while (existing && attempts < 5) {
      reference = `EST-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2, 6)
        .toUpperCase()}`;
      existing = await Estimate.findOne({ reference }).lean();
      attempts += 1;
    }
    if (existing) {
      return res.status(409).json({
        message: "Unable to generate unique estimate reference. Please try again.",
      });
    }
    
    const estimate = await Estimate.create({
      reference,
      customerId: customer._id,
      salesRep: salesRep._id,
      status,
      items: normalizedItems,
      total,
      message,
      signature,
      print,
    });
    return res.status(201).json({
      message: "Estimate created successfully",
      estimate,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Estimate with this reference number already exists",
      });
    }
    console.error("Create estimate error:", error);
    return res.status(500).json({
      message: "Error creating estimate",
      errorMessage: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};

const getEstimates = async (_req: AuthRequest, res: Response) => {
  try {
    const estimates = await Estimate.find({})
      .populate("customerId", "name email phone billingAddress shippingAddress")
      .sort({ createdAt: -1 })
      .lean();

    const mapped = await Promise.all(estimates.map(async (estimate: any) => {
      const customer = estimate.customerId || {};
      const salesRepValue = estimate.salesRep;
      let salesRepLabel = "";
      if (salesRepValue) {
        const salesRepId = salesRepValue.toString();
        if (Types.ObjectId.isValid(salesRepId)) {
          const rep = await User.findById(salesRepId).lean();
          salesRepLabel = rep?.fullName || rep?.email || salesRepId;
        } else {
          salesRepLabel = salesRepId;
        }
      }
      const items = Array.isArray(estimate.items) ? estimate.items : [];
      const total = Number(
        (typeof estimate.total === "number"
          ? estimate.total
          : items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
        ).toFixed(2)
      );
      return {
        reference: estimate.reference || estimate._id.toString(),
        customerName: customer.name || "",
        customerEmail: customer.email || "",
        createdAt: estimate.createdAt,
        status: estimate.status,
        salesRep: salesRepLabel,
        total,
      };
    }));

    return res.status(200).json({
      message: "Estimates fetched successfully",
      estimates: mapped,
    });
  } catch (error: any) {
    console.error("Get estimates error:", error);
    return res.status(500).json({
      message: "Error fetching estimates",
      errorMessage: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};

const getEstimateByReference = async (req: AuthRequest, res: Response) => {
  try {
    const reference = typeof req.params?.reference === "string" ? req.params.reference.trim() : "";
    const queryReference = typeof req.query?.id === "string" ? req.query.id.trim() : "";
    if (!reference) {
      return res.status(400).json({
        message: "Estimate reference is required",
      });
    }
    if (queryReference && queryReference !== reference) {
      return res.status(400).json({
        message: "Estimate reference mismatch",
      });
    }

    const estimate = await Estimate.findOne({ reference })
      .populate("customerId", "name email phone billingAddress shippingAddress")
      .lean();
    if (!estimate) {
      return res.status(404).json({
        message: "Estimate not found",
      });
    }

    const customer = estimate.customerId as any;
    const salesRepValue = estimate.salesRep;
    let salesRepLabel = "";
    if (salesRepValue) {
      const salesRepId = salesRepValue.toString();
      if (Types.ObjectId.isValid(salesRepId)) {
        const rep = await User.findById(salesRepId).lean();
        salesRepLabel = rep?.fullName || rep?.email || salesRepId;
      } else {
        salesRepLabel = salesRepId;
      }
    }
    const items = Array.isArray(estimate.items) ? estimate.items : [];
    const total = Number(
      (typeof estimate.total === "number"
        ? estimate.total
        : items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
      ).toFixed(2)
    );

    return res.status(200).json({
      message: "Estimate fetched successfully",
      estimate: {
        reference: estimate.reference,
        customer: {
          id: customer?._id,
          name: customer?.name || "",
          email: customer?.email || "",
          phone: customer?.phone || "",
          billingAddress: customer?.billingAddress || "",
          shippingAddress: customer?.shippingAddress || "",
        },
        createdAt: estimate.createdAt,
        status: estimate.status,
        salesRep: salesRepLabel,
        salesRepId: estimate.salesRep,
        total,
        items: items.map((item: any) => ({
          productCode: item.productCode || "",
          description: item.description || "",
          quantity: item.quantity ?? 0,
          discount: item.discount ?? 0,
          amount: item.amount ?? 0,
        })),
        message: estimate.message,
        signature: estimate.signature,
        print: estimate.print,
      },
    });
  } catch (error: any) {
    console.error("Get estimate error:", error);
    return res.status(500).json({
      message: "Error fetching estimate",
      errorMessage: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};

const updateEstimate = async (req: AuthRequest, res: Response) => {
  try {
    const reference =
      typeof req.params?.reference === "string" ? req.params.reference.trim() : "";
    if (!reference) {
      return res.status(400).json({
        message: "Estimate reference is required",
      });
    }

    const body = req.body || {};
    const payload = body?.payload && typeof body.payload === "object" ? body.payload : body;

    const customerIdValidation = validateObjectId(payload?.customerId ?? "", true);
    if (!customerIdValidation.isValid) {
      return res.status(400).json({
        message: customerIdValidation.error || "Customer is required",
      });
    }
    const customer = await Customer.findById(customerIdValidation.value).lean();
    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (!items.length) {
      return res.status(400).json({
        message: "At least one line item is required",
      });
    }

    const normalizedItems = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index] || {};
      const qty = Number(item.quantity ?? item.qty);
      const unitPrice = Number(item.unitPrice ?? item.price ?? item.unit_price);
      const discount = Number(item.discount ?? 0);
      const descriptionValidation = validateString(item.description ?? item.name ?? "", {
        required: true,
        maxLength: 500,
        checkMalicious: true,
      });
      const productCodeValidation = validateString(item.productCode ?? "", {
        required: true,
        maxLength: 100,
        checkMalicious: true,
      });
      if (!descriptionValidation.isValid) {
        return res.status(400).json({
          message: `Invalid item name for item ${index + 1}`,
        });
      }
      if (!productCodeValidation.isValid) {
        return res.status(400).json({
          message: `Invalid product code for item ${index + 1}`,
        });
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({
          message: `Quantity must be greater than 0 for item ${index + 1}`,
        });
      }
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return res.status(400).json({
          message: `Unit price must be greater than 0 for item ${index + 1}`,
        });
      }
      if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({
          message: `Discount must be between 0 and 100 for item ${index + 1}`,
        });
      }
      const amount = Number((qty * unitPrice * (1 - discount / 100)).toFixed(2));
      normalizedItems.push({
        productCode: productCodeValidation.value || undefined,
        description: descriptionValidation.value || undefined,
        quantity: qty,
        discount,
        amount,
      });
    }

    const statusInput =
      typeof payload?.status === "string" ? payload.status.trim() : "draft";
    const status =
      statusInput === "pending" || statusInput === "draft" ? statusInput : "draft";

    const messageValidation = validateString(payload?.message ?? "", {
      required: true,
      maxLength: 2000,
      checkMalicious: true,
    });
    if (!messageValidation.isValid) {
      return res.status(400).json({
        message: messageValidation.error || "Invalid message",
      });
    }

    const signatureValidation = validateString(payload?.signature ?? "", {
      required: true,
      maxLength: 200000,
      checkMalicious: true,
    });
    if (!signatureValidation.isValid) {
      return res.status(400).json({
        message: signatureValidation.error || "Invalid signature",
      });
    }

    const salesRepValidation = validateObjectId(payload?.salesRep ?? "", true);
    if (!salesRepValidation.isValid) {
      return res.status(400).json({
        message: salesRepValidation.error || "Sales representative is required",
      });
    }
    const salesRep = await User.findById(salesRepValidation.value).lean();
    if (!salesRep) {
      return res.status(404).json({
        message: "Sales representative not found",
      });
    }

    const message = messageValidation.value || undefined;
    const signature = signatureValidation.value || undefined;
    const print = Boolean(payload?.print);
    const total = Number(
      normalizedItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
    );

    const updated = await Estimate.findOneAndUpdate(
      { reference },
      {
        customerId: customer._id,
        salesRep: salesRep._id,
        status,
        items: normalizedItems,
        total,
        message,
        signature,
        print,
      },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({
        message: "Estimate not found",
      });
    }

    return res.status(200).json({
      message: "Estimate updated successfully",
      estimate: updated,
    });
  } catch (error: any) {
    console.error("Update estimate error:", error);
    return res.status(500).json({
      message: "Error updating estimate",
      errorMessage: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};

const deleteEstimate = async (req: AuthRequest, res: Response) => {
  return res.status(200).json({
    message: "Estimate deleted successfully",
    id: req.params.id,
  });
};

const updateEstimateStatus = async (req: AuthRequest, res: Response) => {
  return res.status(200).json({
    message: "Estimate status updated successfully",
    id: req.params.id,
    status: req.body?.status,
  });
};

export {
  createEstimate,
  getEstimates,
  getEstimateByReference,
  updateEstimate,
  deleteEstimate,
  updateEstimateStatus,
};

