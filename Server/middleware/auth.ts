import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthRequest extends Request {
  user?: {
    userId?: string;
    email: string;
    role: string;
    permissions?: string[];
  };
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const token = authHeader.substring(7);

    if (!token || token.trim().length === 0) {
      res.status(401).json({ message: "Token is required" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    req.user = {
      userId: decoded.userId || decoded.email, // Support both formats
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({ message: "Token has expired" });
      return;
    }
    if (error.name === "JsonWebTokenError") {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    res.status(401).json({ message: "Authentication failed" });
  }
};

/**
 * Middleware to authorize based on roles
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
      return;
    }

    next();
  };
};

