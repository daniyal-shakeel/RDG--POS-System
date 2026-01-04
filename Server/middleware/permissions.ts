import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

/**
 * Checks if user has a specific permission
 * Supports wildcard permissions (e.g., "customer.*" matches "customer.create")
 * @param userPermissions - Array of user permissions
 * @param requiredPermission - Required permission (e.g., "customer.create")
 * @returns true if user has the permission
 */
export const hasPermission = (
  userPermissions: string[],
  requiredPermission: string
): boolean => {
  // Super Admin has all permissions
  if (userPermissions.includes("*")) {
    return true;
  }

  // Exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check for wildcard permission (e.g., "customer.*" matches "customer.create")
  const permissionParts = requiredPermission.split(".");
  if (permissionParts.length >= 2) {
    const wildcardPermission = `${permissionParts[0]}.*`;
    if (userPermissions.includes(wildcardPermission)) {
      return true;
    }
  }

  return false;
};

/**
 * Middleware to check if user has required permission
 * @param requiredPermission - Permission required (e.g., "customer.create")
 */
export const requirePermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userPermissions = req.user.permissions || [];

    if (!hasPermission(userPermissions, requiredPermission)) {
      res.status(403).json({
        message: `Access denied. Required permission: ${requiredPermission}`,
      });
      return;
    }

    next();
  };
};

