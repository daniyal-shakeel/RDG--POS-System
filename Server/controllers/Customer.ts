import { Response } from "express";
import { Types } from "mongoose";
import Customer, { IAddress } from "../models/Customer";
import { validateName, validateEmail, validatePhone, validateAddress } from "../utils/validation";
import { AuthRequest } from "../middleware/auth";
import { hasPermission } from "../middleware/permissions";

type CreateCustomerBody = {
  name: string;
  email: string;
  phone: string;
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

    const newCustomer = await Customer.create({
      customerCode,
      name: nameValidation.value!,
      email: emailValidation.value!,
      phone: phoneValidation.value!,
      billingAddress: billingAddress,
      shippingAddress: shippingAddress,
      status: body.status || "active",
    });

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
    if (!hasPermission(userPermissions, "customer.read")) {
      return res.status(403).json({
        message: "Access denied. Required permission: customer.read",
      });
    }

    const customers = await Customer.find({}).sort({ createdAt: -1 });

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
    if (!hasPermission(userPermissions, "customer.read")) {
      return res.status(403).json({
        message: "Access denied. Required permission: customer.read",
      });
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const customer = await Customer.findOne({
      _id: new Types.ObjectId(id),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
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

    // Validate phone format if provided
    if (body.phone !== undefined) {
      const phoneValidation = validatePhone(body.phone, false);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ message: phoneValidation.error || "Invalid phone" });
      }
      body.phone = phoneValidation.value!;
    }

    const customer = await Customer.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
      },
      {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.billingAddress !== undefined
          ? { billingAddress: body.billingAddress }
          : {}),
        ...(body.shippingAddress !== undefined
          ? { shippingAddress: body.shippingAddress }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
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
