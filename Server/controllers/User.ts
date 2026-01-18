import { Response } from "express";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Role from "../models/Role";
import { validateEmail, validateName, validatePhone, validateAddress } from "../utils/validation";
import { getDefaultPermissionsForRole } from "../utils/permissions";
import { getRedisClient } from "../config/redis";
import { AuthRequest } from "../middleware/auth";

type CreateUserBody = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: string; // Role name: "Admin", "Stock-Keeper", or "Sales Representative"
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
};

const USER_LIST_CACHE_KEY = "users:all";
const USER_ROLE_LIST_CACHE_PREFIX = "users:role:";
const USER_CACHE_PREFIX = "users:";
const USER_CACHE_TTL_SECONDS = 300;

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

const invalidateUserListCaches = async (cacheClient: any) => {
  try {
    const keys: string[] = [USER_LIST_CACHE_KEY];
    for await (const key of cacheClient.scanIterator({
      MATCH: `${USER_ROLE_LIST_CACHE_PREFIX}*`,
    })) {
      keys.push(key as string);
    }
    if (keys.length) {
      await cacheClient.del(...keys);
    }
  } catch (error) {
    console.error("Redis cache error:", error);
  }
};

const mapUserForResponse = (user: any) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  address: user.address,
  roles: user.roleIds || [],
  status: user.status,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

/**
 * Validates password strength
 */
const validatePassword = (
  password: any,
  required: boolean = false
): { isValid: boolean; value: string | null; error?: string } => {
  if (required && (!password || (typeof password === "string" && password.trim().length === 0))) {
    return { isValid: false, value: null, error: "Password is required" };
  }

  if (!password || (typeof password === "string" && password.trim().length === 0)) {
    return { isValid: true, value: "" };
  }

  if (typeof password !== "string") {
    return { isValid: false, value: null, error: "Password must be a string" };
  }

  const trimmed = password.trim();

  if (trimmed.length < 6) {
    return { isValid: false, value: null, error: "Password must be at least 6 characters" };
  }

  if (trimmed.length > 128) {
    return { isValid: false, value: null, error: "Password is too long (max 128 characters)" };
  }

  if (trimmed.includes("<script") || trimmed.includes("javascript:")) {
    return { isValid: false, value: null, error: "Invalid password format" };
  }

  return { isValid: true, value: trimmed };
};

/**
 * Create a new user (only super admin can do this)
 */
const createUser = async (req: AuthRequest, res: Response) => {
  try {
    // Verify super admin
    if (!req.user || req.user.role !== "Super Admin") {
      return res.status(403).json({
        message: "Only super admin can create users",
      });
    }

    const body = req.body as CreateUserBody;

    // Validate fullName
    const nameValidation = validateName(body?.fullName, true);
    if (!nameValidation.isValid) {
      return res.status(400).json({
        message: nameValidation.error || "Invalid name",
      });
    }

    // Validate email
    const emailValidation = validateEmail(body?.email, true);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        message: emailValidation.error || "Invalid email format",
      });
    }

    // Validate password
    const passwordValidation = validatePassword(body?.password, true);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: passwordValidation.error || "Invalid password",
      });
    }

    // Validate phone if provided
    let phoneValidation = null;
    if (body.phone) {
      phoneValidation = validatePhone(body.phone, false);
      if (!phoneValidation.isValid) {
        return res.status(400).json({
          message: phoneValidation.error || "Invalid phone format",
        });
      }
    }

    // Validate address if provided
    let addressValidation = null;
    if (body.address) {
      addressValidation = validateAddress(body.address, false);
      if (!addressValidation.isValid) {
        return res.status(400).json({
          message: addressValidation.error || "Invalid address",
        });
      }
    }

    // Validate role
    if (!body.role || typeof body.role !== "string") {
      return res.status(400).json({
        message: "Role is required",
      });
    }

    const allowedRoles = ["Admin", "Stock-Keeper", "Sales Representative"];
    const roleName = body.role.trim();
    if (!allowedRoles.includes(roleName)) {
      return res.status(400).json({
        message: `Invalid role. Allowed roles: ${allowedRoles.join(", ")}`,
      });
    }

    const sanitizedEmail = emailValidation.value!.toLowerCase().trim();
    const sanitizedPassword = passwordValidation.value!;

    // Check if user already exists
    const existingUser = await User.findOne({ email: sanitizedEmail }).lean();
    if (existingUser) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    // Find or create role
    let role = await Role.findOne({ name: roleName });
    if (!role) {
      // Create role with default permissions
      const defaultPermissions = getDefaultPermissionsForRole(roleName);

      role = await Role.create({
        name: roleName,
        permissionKeys: defaultPermissions,
        isSystemRole: true,
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(sanitizedPassword, 10);

    // Create user
    const newUser = await User.create({
      fullName: nameValidation.value!,
      email: sanitizedEmail,
      passwordHash,
      phone: phoneValidation?.value || undefined,
      roleIds: [role._id],
      address: addressValidation?.value || undefined,
      status: "active",
    });

    // Populate role for response
    const userWithRole = await User.findById(newUser._id)
      .populate("roleIds", "name permissionKeys")
      .lean();

    const userPayload = {
      id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      address: newUser.address,
      role: roleName,
      roles: userWithRole?.roleIds || [],
    };

    const cacheClient = await getRedisClient();
    if (cacheClient) {
      const userKey = `${USER_CACHE_PREFIX}${newUser._id.toString()}`;
      await runCacheOps([
        cacheClient.setEx(userKey, USER_CACHE_TTL_SECONDS, JSON.stringify(userPayload)),
      ]);
      await invalidateUserListCaches(cacheClient);
    }

    return res.status(201).json({
      message: "User created successfully",
      user: userPayload,
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return res.status(500).json({
      message: "Error creating user",
      errorMessage: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};

/**
 * Get all users (requires user.manage permission - checked by middleware)
 */
const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    // Permission check is handled by requirePermission middleware in routes
    // User is guaranteed to have user.manage permission at this point
    const allowedRoleFilters = ["Admin", "Stock-Keeper", "Sales Representative"];
    const roleFromQuery =
      typeof req.query?.role === "string" ? req.query.role.trim() : "";
    const roleFromBody =
      typeof (req.body as any)?.role === "string" ? (req.body as any).role.trim() : "";
    const requestedRole = roleFromQuery || roleFromBody;
    const normalizedRole = requestedRole
      ? allowedRoleFilters.find(
          (role) => role.toLowerCase() === requestedRole.toLowerCase()
        )
      : "";
    if (requestedRole && !normalizedRole) {
      return res.status(400).json({
        message: `Invalid role filter. Allowed roles: ${allowedRoleFilters.join(", ")}`,
      });
    }
    const roleCacheKey = normalizedRole
      ? `${USER_ROLE_LIST_CACHE_PREFIX}${normalizedRole.toLowerCase().replace(/\s+/g, "-")}`
      : USER_LIST_CACHE_KEY;

    const cacheClient = await getRedisClient();
    if (cacheClient) {
      try {
        const cachedUsers = await cacheClient.get(roleCacheKey);
        if (cachedUsers) {
          return res.status(200).json({
            message: "Users fetched successfully",
            users: JSON.parse(cachedUsers),
          });
        }
      } catch (error) {
        console.error("Redis cache read error:", error);
      }
    }

    let roleIdFilter: Types.ObjectId | null = null;
    if (normalizedRole) {
      const roleDoc = await Role.findOne({ name: normalizedRole }).lean();
      roleIdFilter = roleDoc?._id || null;
    }

    if (normalizedRole && !roleIdFilter) {
      return res.status(200).json({
        message: "Users fetched successfully",
        users: [],
      });
    }

    const users = await User.find(roleIdFilter ? { roleIds: roleIdFilter } : {})
      .populate("roleIds", "name permissionKeys")
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .lean();

    const usersPayload = users.map(mapUserForResponse);

    if (cacheClient) {
      await runCacheOps([
        cacheClient.setEx(
          roleCacheKey,
          USER_CACHE_TTL_SECONDS,
          JSON.stringify(usersPayload)
        ),
      ]);
    }

    return res.status(200).json({
      message: "Users fetched successfully",
      users: usersPayload,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching users",
      errorMessage: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};

/**
 * Suspend a user (only super admin can do this)
 */
const suspendUser = async (req: AuthRequest, res: Response) => {
  try {
    // Verify super admin
    if (!req.user || req.user.role !== "Super Admin") {
      return res.status(403).json({
        message: "Only super admin can suspend users",
      });
    }

    const { id } = req.params;

    // Validate user ID
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID format",
      });
    }

    // Check if trying to suspend super admin (should not be allowed)
    const user = await User.findById(id).lean();
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check if user is already suspended
    if (user.status === "suspended") {
      return res.status(400).json({
        message: "User is already suspended",
      });
    }

    // Update user status to suspended
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { status: "suspended" },
      { new: true }
    )
      .populate("roleIds", "name permissionKeys")
      .select("-passwordHash")
      .lean();

    const userPayload = {
      id: updatedUser?._id,
      fullName: updatedUser?.fullName,
      email: updatedUser?.email,
      phone: updatedUser?.phone,
      address: updatedUser?.address,
      roles: updatedUser?.roleIds || [],
      status: updatedUser?.status,
    };

    const cacheClient = await getRedisClient();
    if (cacheClient && updatedUser?._id) {
      const userKey = `${USER_CACHE_PREFIX}${updatedUser._id.toString()}`;
      await runCacheOps([
        cacheClient.setEx(userKey, USER_CACHE_TTL_SECONDS, JSON.stringify(userPayload)),
      ]);
      await invalidateUserListCaches(cacheClient);
    }

    return res.status(200).json({
      message: "User suspended successfully",
      user: userPayload,
    });
  } catch (error: any) {
    console.error("Suspend user error:", error);
    return res.status(500).json({
      message: "Error suspending user",
      errorMessage: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};

/**
 * Unsuspend/Activate a user (only super admin can do this)
 */
const unsuspendUser = async (req: AuthRequest, res: Response) => {
  try {
    // Verify super admin
    if (!req.user || req.user.role !== "Super Admin") {
      return res.status(403).json({
        message: "Only super admin can unsuspend users",
      });
    }

    const { id } = req.params;

    // Validate user ID
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(id).lean();
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check if user is not suspended
    if (user.status !== "suspended") {
      return res.status(400).json({
        message: `User is not suspended. Current status: ${user.status}`,
      });
    }

    // Update user status to inactive (they need to log in to become active)
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true }
    )
      .populate("roleIds", "name permissionKeys")
      .select("-passwordHash")
      .lean();

    const userPayload = {
      id: updatedUser?._id,
      fullName: updatedUser?.fullName,
      email: updatedUser?.email,
      phone: updatedUser?.phone,
      address: updatedUser?.address,
      roles: updatedUser?.roleIds || [],
      status: updatedUser?.status,
    };

    const cacheClient = await getRedisClient();
    if (cacheClient && updatedUser?._id) {
      const userKey = `${USER_CACHE_PREFIX}${updatedUser._id.toString()}`;
      await runCacheOps([
        cacheClient.setEx(userKey, USER_CACHE_TTL_SECONDS, JSON.stringify(userPayload)),
      ]);
      await invalidateUserListCaches(cacheClient);
    }

    return res.status(200).json({
      message: "User unsuspended successfully. User can now log in.",
      user: userPayload,
    });
  } catch (error: any) {
    console.error("Unsuspend user error:", error);
    return res.status(500).json({
      message: "Error unsuspending user",
      errorMessage: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};

export { createUser, getUsers, suspendUser, unsuspendUser };

