import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { validateEmail } from "../utils/validation";
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } from "../app";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../app";

type LoginBody = {
  email: string;
  password: string;
  role?: string; 
};




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




const login = async (req: Request, res: Response) => {

  try {
    const body = req.body as LoginBody;

    
    const emailValidation = validateEmail(body?.email, true);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        message: emailValidation.error || "Invalid email format",
      });
    }

    
    const passwordValidation = validatePassword(body?.password, true);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: passwordValidation.error || "Invalid password",
      });
    }

    const sanitizedEmail = emailValidation.value!.toLowerCase().trim();
    const sanitizedPassword = passwordValidation.value!;

    
    if (
      SUPER_ADMIN_EMAIL &&
      SUPER_ADMIN_PASSWORD &&
      sanitizedEmail === SUPER_ADMIN_EMAIL.toLowerCase().trim() &&
      sanitizedPassword === SUPER_ADMIN_PASSWORD
    ) {
      const tokenPayload = {
        email: sanitizedEmail,
        role: "Super Admin",
        permissions: ["*"], 
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

    
    const user = await User.findOne({ email: sanitizedEmail })
      .populate("roleIds", "name permissionKeys")
      .lean();

    if (!user) {
      
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    
    if (user.status === "suspended") {
      return res.status(403).json({
        message: "Account is suspended. Please contact administrator.",
      });
    }

    
    const isPasswordValid = await bcrypt.compare(sanitizedPassword, user.passwordHash);

    if (!isPasswordValid) {
      
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    
    if (!user.roleIds || user.roleIds.length === 0) {
      return res.status(403).json({
        message: "User has no assigned roles. Please contact administrator.",
      });
    }

    
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
      
      selectedRole = user.roleIds[0];
    }

    
    await User.updateOne(
      { _id: user._id },
      { 
        lastLoginAt: new Date(),
        status: 'active'
      }
    );

    
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





const logout = async (req: Request, res: Response) => {
  try {
    
    const authHeader = req.headers.authorization;

    
    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided",
        error: "Authorization header is missing",
      });
    }

    
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Invalid token format",
        error: "Authorization header must start with 'Bearer '",
      });
    }

    
    const token = authHeader.substring(7);

    
    if (!token || token.trim().length === 0) {
      return res.status(401).json({
        message: "Token is required",
        error: "Token cannot be empty",
      });
    }

    
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      return res.status(401).json({
        message: "Invalid token format",
        error: "Token must be a valid JWT format",
      });
    }

    
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error: any) {
      
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Token has expired",
          error: "Please login again",
        });
      }

      
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          message: "Invalid token",
          error: "Token verification failed",
        });
      }

      
      return res.status(401).json({
        message: "Token verification failed",
        error: error.message || "Unknown token error",
      });
    }

    
    if (!decoded || typeof decoded !== "object") {
      return res.status(401).json({
        message: "Invalid token payload",
        error: "Token does not contain valid user information",
      });
    }

    
    if (!decoded.email || typeof decoded.email !== "string") {
      return res.status(401).json({
        message: "Invalid token payload",
        error: "Token does not contain email information",
      });
    }

    
    if (!decoded.role || typeof decoded.role !== "string") {
      return res.status(401).json({
        message: "Invalid token payload",
        error: "Token does not contain role information",
      });
    }

    const userEmail = decoded.email.toLowerCase().trim();
    const userRole = decoded.role;

    
    if (userRole === "Super Admin") {
      
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
        
        return res.status(403).json({
          message: "Invalid Super Admin token",
          error: "Token email does not match Super Admin credentials",
        });
      }
    }

    
    
    if (decoded.userId) {
      try {
        const user = await User.findById(decoded.userId).select("email status").lean();

        
        if (!user) {
          return res.status(401).json({
            message: "User not found",
            error: "User associated with this token no longer exists",
          });
        }

        
        if (user.email.toLowerCase().trim() !== userEmail) {
          return res.status(403).json({
            message: "Token email mismatch",
            error: "Token email does not match user record",
          });
        }

        
        
        
        let finalStatus = user.status;
        if (user.status !== "suspended") {
          await User.updateOne(
            { _id: decoded.userId },
            { status: "inactive" }
          );
          finalStatus = "inactive";
        }

        
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
        
        console.error("Database error during logout:", dbError);
        return res.status(500).json({
          message: "Error verifying user",
          error: process.env.NODE_ENV === "development" ? dbError?.message : "Database error occurred",
        });
      }
    } else {
      
      
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
    
    console.error("Logout error:", error);
    return res.status(500).json({
      message: "Error during logout",
      error: process.env.NODE_ENV === "development" ? error?.message : "An unexpected error occurred",
    });
  }
};

export { login, logout };
