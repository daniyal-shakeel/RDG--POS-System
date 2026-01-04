import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { validateEmail } from "../utils/validation";
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } from "../app";
const JWT_SECRET: string = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d";

// Super Admin credentials from environment variables
type LoginBody = {
  email: string;
  password: string;
  role?: string; // Optional for role selection if user has multiple roles
};

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
 * Login user - supports Super Admin (from env) and database users
 */
const login = async (req: Request, res: Response) => {

  try {
    const body = req.body as LoginBody;

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

    const sanitizedEmail = emailValidation.value!.toLowerCase().trim();
    const sanitizedPassword = passwordValidation.value!;

    // Check Super Admin credentials from environment variables
    if (
      SUPER_ADMIN_EMAIL &&
      SUPER_ADMIN_PASSWORD &&
      sanitizedEmail === SUPER_ADMIN_EMAIL.toLowerCase().trim() &&
      sanitizedPassword === SUPER_ADMIN_PASSWORD
    ) {
      const tokenPayload = {
        email: sanitizedEmail,
        role: "Super Admin",
        permissions: ["*"], // Super admin has all permissions
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      } as jwt.SignOptions);

      return res.status(200).json({
        message: "Login successful",
        token,
        user: {
          email: sanitizedEmail,
          role: "Super Admin",
          permissions: ["*"],
        },
      });
    }

    // Check database users
    const user = await User.findOne({ email: sanitizedEmail })
      .populate("roleIds", "name permissionKeys")
      .lean();

    if (!user) {
      // Return generic error to prevent email enumeration
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check if user is suspended (inactive users can log in and will be set to active)
    if (user.status === "suspended") {
      return res.status(403).json({
        message: "Account is suspended. Please contact administrator.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(sanitizedPassword, user.passwordHash);

    if (!isPasswordValid) {
      // Return generic error to prevent user enumeration
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Get user's roles
    if (!user.roleIds || user.roleIds.length === 0) {
      return res.status(403).json({
        message: "User has no assigned roles. Please contact administrator.",
      });
    }

    // If role is specified in request, validate it
    let selectedRole: any = null;
    if (body.role) {
      selectedRole = user.roleIds.find(
        (r: any) => r.name.toLowerCase() === body.role!.toLowerCase()
      );

      if (!selectedRole) {
        return res.status(403).json({
          message: `User does not have the role: ${body.role}`,
        });
      }
    } else {
      // Use first role as default
      selectedRole = user.roleIds[0];
    }

    // Update last login and set status to active
    await User.updateOne(
      { _id: user._id },
      { 
        lastLoginAt: new Date(),
        status: 'active'
      }
    );

    // Generate JWT token
    const tokenPayload = {
      userId: user._id.toString(),
      email: sanitizedEmail,
      role: selectedRole.name,
      permissions: selectedRole.permissionKeys || [],
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: sanitizedEmail,
        fullName: user.fullName,
        role: selectedRole.name,
        permissions: selectedRole.permissionKeys || [],
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Error during login",
      errorMessage: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};

/**
 * Logout user - handles both Super Admin and regular users
 * Validates token and provides appropriate response based on user type
 */
const logout = async (req: Request, res: Response) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    // Edge case: No authorization header provided
    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided",
        error: "Authorization header is missing",
      });
    }

    // Edge case: Authorization header doesn't start with "Bearer "
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Invalid token format",
        error: "Authorization header must start with 'Bearer '",
      });
    }

    // Extract token
    const token = authHeader.substring(7);

    // Edge case: Token is empty or just whitespace
    if (!token || token.trim().length === 0) {
      return res.status(401).json({
        message: "Token is required",
        error: "Token cannot be empty",
      });
    }

    // Edge case: Token is too short to be valid (JWT has 3 parts separated by dots)
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      return res.status(401).json({
        message: "Invalid token format",
        error: "Token must be a valid JWT format",
      });
    }

    // Verify and decode token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error: any) {
      // Edge case: Token has expired
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Token has expired",
          error: "Please login again",
        });
      }

      // Edge case: Invalid token signature or malformed token
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          message: "Invalid token",
          error: "Token verification failed",
        });
      }

      // Edge case: Other JWT errors
      return res.status(401).json({
        message: "Token verification failed",
        error: error.message || "Unknown token error",
      });
    }

    // Edge case: Decoded token doesn't have required fields
    if (!decoded || typeof decoded !== "object") {
      return res.status(401).json({
        message: "Invalid token payload",
        error: "Token does not contain valid user information",
      });
    }

    // Edge case: Missing email in token
    if (!decoded.email || typeof decoded.email !== "string") {
      return res.status(401).json({
        message: "Invalid token payload",
        error: "Token does not contain email information",
      });
    }

    // Edge case: Missing role in token
    if (!decoded.role || typeof decoded.role !== "string") {
      return res.status(401).json({
        message: "Invalid token payload",
        error: "Token does not contain role information",
      });
    }

    const userEmail = decoded.email.toLowerCase().trim();
    const userRole = decoded.role;

    // Check if it's Super Admin logout
    if (userRole === "Super Admin") {
      // Verify it matches the super admin email from env
      if (
        SUPER_ADMIN_EMAIL &&
        userEmail === SUPER_ADMIN_EMAIL.toLowerCase().trim()
      ) {
        return res.status(200).json({
          message: "Super Admin logged out successfully",
          user: {
            email: userEmail,
            role: "Super Admin",
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        // Edge case: Token claims to be Super Admin but email doesn't match
        return res.status(403).json({
          message: "Invalid Super Admin token",
          error: "Token email does not match Super Admin credentials",
        });
      }
    }

    // Handle regular user logout
    // Edge case: Token has userId but user doesn't exist in database
    if (decoded.userId) {
      try {
        const user = await User.findById(decoded.userId).select("email status").lean();

        // Edge case: User was deleted after token was issued
        if (!user) {
          return res.status(401).json({
            message: "User not found",
            error: "User associated with this token no longer exists",
          });
        }

        // Edge case: Email in token doesn't match email in database
        if (user.email.toLowerCase().trim() !== userEmail) {
          return res.status(403).json({
            message: "Token email mismatch",
            error: "Token email does not match user record",
          });
        }

        // Update user status on logout
        // - Suspended accounts remain suspended (cannot be changed)
        // - Active/inactive accounts become inactive
        let finalStatus = user.status;
        if (user.status !== "suspended") {
          await User.updateOne(
            { _id: decoded.userId },
            { status: "inactive" }
          );
          finalStatus = "inactive";
        }

        // Successful logout for regular user (suspended users can also logout)
        return res.status(200).json({
          message: user.status === "suspended" 
            ? "Suspended user logged out successfully" 
            : "User logged out successfully",
          user: {
            id: decoded.userId,
            email: userEmail,
            role: userRole,
            status: finalStatus,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (dbError: any) {
        // Edge case: Database error while verifying user
        console.error("Database error during logout:", dbError);
        return res.status(500).json({
          message: "Error verifying user",
          error: process.env.NODE_ENV === "development" ? dbError?.message : "Database error occurred",
        });
      }
    } else {
      // Edge case: Regular user token doesn't have userId
      // This shouldn't happen for database users, but handle it gracefully
      return res.status(200).json({
        message: "Logged out successfully",
        user: {
          email: userEmail,
          role: userRole,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    // Edge case: Unexpected errors
    console.error("Logout error:", error);
    return res.status(500).json({
      message: "Error during logout",
      error: process.env.NODE_ENV === "development" ? error?.message : "An unexpected error occurred",
    });
  }
};

export { login, logout };
