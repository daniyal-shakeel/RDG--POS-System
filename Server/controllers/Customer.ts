import { Response } from "express";
import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import Customer, { IAddress } from "../models/Customer";
import User from "../models/User";
import {
  validateName,
  validateEmail,
  validatePhone,
  validateAddress,
  validateObjectId,
} from "../utils/validation";
import { AuthRequest } from "../middleware/auth";
import { hasPermission } from "../middleware/permissions";
import { getRedisClient } from "../config/redis";
import { JWT_SECRET } from "../app";

const CUSTOMER_LIST_CACHE_KEY = "customers:all";
const CUSTOMER_CACHE_PREFIX = "customers:";
const CUSTOMER_CACHE_TTL_SECONDS = 300;

const runCacheOps = async (ops: Promise<unknown>[]) => {
  if (!ops.length) {
    return;
  }
  try {
    await Promise.all(ops);
  } catch (error) {
    console.error("Redis cache error:", error);
  }
};

type CreateCustomerBody = {
  name: string;
  email: string;
  phone: string;
  salesRep?: string;
  billingAddress: IAddress;
  shippingAddress?: IAddress;
  status?: "active" | "archived";
};

const makeCustomerCode = () => {
  const now = new Date();
  const y = now.getFullYear().toString();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `CUST${y}${m}${d}${rand}`;
};

const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    // Check permissions
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userPermissions = req.user.permissions || [];
    if (!hasPermission(userPermissions, "customer.create")) {
      return res.status(403).json({
        message: "Access denied. Required permission: customer.create",
      });
    }

    const body = req.body as CreateCustomerBody;

    // Validate name (letters only)
    const nameValidation = validateName(body?.name, true);
    if (!nameValidation.isValid) {
      return res.status(400).json({ message: nameValidation.error || "Invalid name" });
    }

    // Validate email format
    const emailValidation = validateEmail(body?.email, true);
    if (!emailValidation.isValid) {
      return res.status(400).json({ message: emailValidation.error || "Invalid email" });
    }

    // Validate phone format
    const phoneValidation = validatePhone(body?.phone, true);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ message: phoneValidation.error || "Invalid phone" });
    }

    // Validate billing address if provided
    let billingAddressValidation = null;
    if (body.billingAddress) {
      billingAddressValidation = validateAddress(body.billingAddress, false);
      if (!billingAddressValidation.isValid) {
        return res.status(400).json({ message: billingAddressValidation.error || "Invalid billing address" });
      }
    }

    // Validate shipping address if provided
    let shippingAddressValidation = null;
    if (body.shippingAddress) {
      shippingAddressValidation = validateAddress(body.shippingAddress, false);
      if (!shippingAddressValidation.isValid) {
        return res.status(400).json({ message: shippingAddressValidation.error || "Invalid shipping address" });
      }
    }

    // Always generate a customer code and ensure it's unique
    let customerCode = makeCustomerCode();
    
    // Check if generated code exists in database
    let codeExists = await Customer.findOne({
      customerCode: customerCode,
    });

    // If code exists, generate a new one (up to 5 attempts)
    let attempts = 0;
    while (codeExists && attempts < 5) {
      customerCode = makeCustomerCode();
      codeExists = await Customer.findOne({
        customerCode: customerCode,
      });
      attempts++;
    }

    // If still exists after attempts, return error
    if (codeExists) {
      return res.status(500).json({
        message: "Unable to generate unique customer code. Please try again.",
      });
    }

    // Check for existing customer with same email
    let existingCustomer = await Customer.findOne({
      email: emailValidation.value,
    }).lean();
    if (existingCustomer) {
      return res.status(409).json({
        message: "Customer already exists with this email",
      });
    }

    // Check for existing customer with same phone
    existingCustomer = await Customer.findOne({
      phone: phoneValidation.value,
    }).lean();
    if (existingCustomer) {
      return res.status(409).json({
        message: "Customer already exists with this phone number",
      });
    }

    // Create the customer with the validated/generated code
    // If shipping address not provided, use billing address
    const billingAddress = billingAddressValidation?.value || undefined;
    const shippingAddress = shippingAddressValidation?.value || billingAddress;
    const salesRepValidation = validateObjectId(body?.salesRep ?? "", false);
    if (!salesRepValidation.isValid) {
      return res.status(400).json({
        message: salesRepValidation.error || "Invalid sales representative",
      });
    }

    let salesRepId: Types.ObjectId | undefined;
    if (salesRepValidation.value) {
      const salesRep = await User.findById(salesRepValidation.value).lean();
      if (!salesRep) {
        return res.status(404).json({
          message: "Sales representative not found",
        });
      }
      salesRepId = salesRep._id;
    }

    const newCustomer = await Customer.create({
      customerCode,
      name: nameValidation.value!,
      email: emailValidation.value!,
      phone: phoneValidation.value!,
      billingAddress: billingAddress,
      shippingAddress: shippingAddress,
      status: body.status || "active",
      salesRep: salesRepId,
    });

    const cacheClient = await getRedisClient();
    if (cacheClient) {
      const customerKey = `${CUSTOMER_CACHE_PREFIX}${newCustomer._id.toString()}`;
      await runCacheOps([
        cacheClient.setEx(customerKey, CUSTOMER_CACHE_TTL_SECONDS, JSON.stringify(newCustomer)),
        cacheClient.del(CUSTOMER_LIST_CACHE_KEY),
      ]);
    }

    return res
      .status(201)
      .json({ message: "Customer created successfully", customer: newCustomer });
  } catch (error: any) {
    // Handle duplicate key error (MongoDB unique constraint)
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Customer code already exists",
        errorMessage: error?.message,
      });
    }
    return res.status(500).json({
      message: "Error creating customer",
      errorMessage: error?.message,
    });
  }
};

const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    // Check permissions
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userPermissions = req.user.permissions || [];
    if (!hasPermission(userPermissions, "customer.view")) {
      return res.status(403).json({
        message: "Access denied. Required permission: customer.view",
      });
    }

    const cacheClient = await getRedisClient();
    if (cacheClient) {
      try {
        const cachedCustomers = await cacheClient.get(CUSTOMER_LIST_CACHE_KEY);
        if (cachedCustomers) {
          return res.status(200).json({
            message: "Customers fetched successfully",
            customers: JSON.parse(cachedCustomers),
          });
        }
      } catch (error) {
        console.error("Redis cache read error:", error);
      }
    }

    const customers = await Customer.find({}).sort({ createdAt: -1 });

    if (cacheClient) {
      await runCacheOps([
        cacheClient.setEx(
          CUSTOMER_LIST_CACHE_KEY,
          CUSTOMER_CACHE_TTL_SECONDS,
          JSON.stringify(customers)
        ),
      ]);
    }

    return res
      .status(200)
      .json({ message: "Customers fetched successfully", customers });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching customers",
      errorMessage: error?.message,
    });
  }
};

const getCustomerById = async (req: AuthRequest, res: Response) => {
  try {
    // Check permissions
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userPermissions = req.user.permissions || [];
    if (!hasPermission(userPermissions, "customer.view")) {
      return res.status(403).json({
        message: "Access denied. Required permission: customer.view",
      });
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const cacheClient = await getRedisClient();
    const customerCacheKey = `${CUSTOMER_CACHE_PREFIX}${id}`;
    if (cacheClient) {
      try {
        const cachedCustomer = await cacheClient.get(customerCacheKey);
        if (cachedCustomer) {
          return res.status(200).json({
            message: "Customer fetched successfully",
            customer: JSON.parse(cachedCustomer),
          });
        }
      } catch (error) {
        console.error("Redis cache read error:", error);
      }
    }

    const customer = await Customer.findOne({
      _id: new Types.ObjectId(id),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (cacheClient) {
      await runCacheOps([
        cacheClient.setEx(
          customerCacheKey,
          CUSTOMER_CACHE_TTL_SECONDS,
          JSON.stringify(customer)
        ),
      ]);
    }

    return res
      .status(200)
      .json({ message: "Customer fetched successfully", customer });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching customer",
      errorMessage: error?.message,
    });
  }
};

const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    // Validate token from Authorization header (in addition to middleware)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: missing token" });
    }
    const token = authHeader.substring(7).trim();
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: missing token" });
    }
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error: any) {
      const message =
        error?.name === "TokenExpiredError"
          ? "Token has expired"
          : "Invalid token";
      return res.status(401).json({ message });
    }

    // Check permissions
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userPermissions = req.user.permissions || [];
    if (!hasPermission(userPermissions, "customer.update")) {
      return res.status(403).json({
        message: "Access denied. Required permission: customer.update",
      });
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const body = req.body as Partial<CreateCustomerBody>;
    if (!body || Object.keys(body).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }

    const customer = await Customer.findById(new Types.ObjectId(id));
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Validate and sanitize inputs that were provided
    const sanitized: Partial<CreateCustomerBody> = {};
    let salesRepProvided = false;
    let salesRepId: Types.ObjectId | null = null;

    if (body.name !== undefined) {
      const nameValidation = validateName(body.name, false);
      if (!nameValidation.isValid) {
        return res.status(400).json({ message: nameValidation.error || "Invalid name" });
      }
      sanitized.name = nameValidation.value || "";
    }

    if (body.email !== undefined) {
      const emailValidation = validateEmail(body.email, false);
      if (!emailValidation.isValid) {
        return res.status(400).json({ message: emailValidation.error || "Invalid email" });
      }
      sanitized.email = emailValidation.value || "";
    }

    if (body.phone !== undefined) {
      const phoneValidation = validatePhone(body.phone, false);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ message: phoneValidation.error || "Invalid phone" });
      }
      sanitized.phone = phoneValidation.value || "";
    }

    if (body.billingAddress !== undefined) {
      const billingValidation = validateAddress(body.billingAddress, false);
      if (!billingValidation.isValid) {
        return res.status(400).json({ message: billingValidation.error || "Invalid billing address" });
      }
      sanitized.billingAddress = billingValidation.value || undefined;
    }

    if (body.shippingAddress !== undefined) {
      const shippingValidation = validateAddress(body.shippingAddress, false);
      if (!shippingValidation.isValid) {
        return res.status(400).json({ message: shippingValidation.error || "Invalid shipping address" });
      }
      sanitized.shippingAddress = shippingValidation.value || undefined;
    }

    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "archived") {
        return res.status(400).json({ message: "Invalid status value" });
      }
      sanitized.status = body.status;
    }

    if (body.salesRep !== undefined) {
      salesRepProvided = true;
      const salesRepValidation = validateObjectId(body.salesRep, false);
      if (!salesRepValidation.isValid) {
        return res.status(400).json({
          message: salesRepValidation.error || "Invalid sales representative",
        });
      }

      if (salesRepValidation.value) {
        const salesRep = await User.findById(salesRepValidation.value).lean();
        if (!salesRep) {
          return res.status(404).json({ message: "Sales representative not found" });
        }
        salesRepId = salesRep._id;
      } else {
        salesRepId = null;
      }
    }

    const updates: Partial<CreateCustomerBody> = {};
    let hasChanges = false;

    const applyPrimitiveChange = (key: keyof CreateCustomerBody, newValue: any) => {
      if (newValue === undefined) {
        return;
      }
      const currentValue = (customer as any)[key];
      const normalizedCurrent = typeof currentValue === "string" ? currentValue.trim() : currentValue;
      const normalizedNew = typeof newValue === "string" ? newValue.trim() : newValue;
      if (normalizedNew !== normalizedCurrent) {
        hasChanges = true;
        (updates as any)[key] = newValue;
      }
    };

    const buildAddressPatch = (
      incoming?: IAddress | null,
      existing?: IAddress | null
    ): IAddress | null => {
      if (!incoming) {
        return null;
      }
      const patch: IAddress = {};
      const keys = Object.keys(incoming) as (keyof IAddress)[];
      keys.forEach((key) => {
        const newVal = incoming[key];
        if (newVal === undefined) {
          return;
        }
        const existingVal = existing ? existing[key] : undefined;
        const normalizedCurrent = typeof existingVal === "string" ? existingVal.trim() : existingVal;
        const normalizedNew = typeof newVal === "string" ? newVal.trim() : newVal;
        if (normalizedNew !== normalizedCurrent) {
          patch[key] = newVal;
        }
      });
      return Object.keys(patch).length ? patch : null;
    };

    applyPrimitiveChange("name", sanitized.name);
    applyPrimitiveChange("email", sanitized.email);
    applyPrimitiveChange("phone", sanitized.phone);
    applyPrimitiveChange("status", sanitized.status);

    if (salesRepProvided) {
      const currentSalesRep = customer.salesRep ? customer.salesRep.toString() : null;
      const nextSalesRep = salesRepId ? salesRepId.toString() : null;
      if (nextSalesRep !== currentSalesRep) {
        hasChanges = true;
        (updates as any).salesRep = salesRepId ?? undefined;
      }
    }

    if (body.billingAddress !== undefined) {
      const existingBilling = customer.billingAddress
        ? (typeof (customer.billingAddress as any).toObject === "function"
            ? (customer.billingAddress as any).toObject()
            : { ...customer.billingAddress })
        : {};
      const billingPatch = buildAddressPatch(
        sanitized.billingAddress || {},
        existingBilling
      );
      if (billingPatch) {
        hasChanges = true;
        updates.billingAddress = { ...existingBilling, ...billingPatch };
      }
    }

    if (body.shippingAddress !== undefined) {
      const existingShipping = customer.shippingAddress
        ? (typeof (customer.shippingAddress as any).toObject === "function"
            ? (customer.shippingAddress as any).toObject()
            : { ...customer.shippingAddress })
        : {};
      const shippingPatch = buildAddressPatch(
        sanitized.shippingAddress || {},
        existingShipping
      );
      if (shippingPatch) {
        hasChanges = true;
        updates.shippingAddress = { ...existingShipping, ...shippingPatch };
      }
    }

    if (!hasChanges) {
      return res.status(400).json({
        message: "No changes detected. Please edit at least one field before updating.",
      });
    }

    Object.assign(customer, updates);
    await customer.save();

    const cacheClient = await getRedisClient();
    if (cacheClient) {
      const customerKey = `${CUSTOMER_CACHE_PREFIX}${id}`;
      await runCacheOps([
        cacheClient.setEx(customerKey, CUSTOMER_CACHE_TTL_SECONDS, JSON.stringify(customer)),
        cacheClient.del(CUSTOMER_LIST_CACHE_KEY),
      ]);
    }

    return res
      .status(200)
      .json({ message: "Customer updated successfully", customer });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error updating customer",
      errorMessage: error?.message,
    });
  }
};

const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    // Check permissions
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userPermissions = req.user.permissions || [];
    if (!hasPermission(userPermissions, "customer.delete")) {
      return res.status(403).json({
        message: "Access denied. Required permission: customer.delete",
      });
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const customer = await Customer.findOneAndDelete({
      _id: new Types.ObjectId(id),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const cacheClient = await getRedisClient();
    if (cacheClient) {
      const customerKey = `${CUSTOMER_CACHE_PREFIX}${id}`;
      await runCacheOps([
        cacheClient.del(customerKey),
        cacheClient.del(CUSTOMER_LIST_CACHE_KEY),
      ]);
    }

    return res
      .status(200)
      .json({ message: "Customer deleted successfully", customer });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error deleting customer",
      errorMessage: error?.message,
    });
  }
};

export { createCustomer, getCustomers, getCustomerById, updateCustomer, deleteCustomer };
