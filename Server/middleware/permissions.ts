import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

/**
 * Maps old permission format to new format for backward compatibility
 * customer.read -> customer.view
 * invoice.read -> invoice.view
 * credit_note -> creditNote
 * etc.
 */
const mapLegacyPermission = (permission: string): string => {
  // Map .read to .view for backward compatibility
  if (permission.endsWith('.read')) {
    return permission.replace('.read', '.view');
  }
  // Map credit_note to creditNote
  if (permission.includes('credit_note')) {
    return permission.replace('credit_note', 'creditNote');
  }
  return permission;
};

/**
 * Checks if user has a specific permission
 * Supports:
 * - Wildcard permissions (e.g., "customer.*" matches "customer.create")
 * - Super admin with "*"
 * - Legacy format mapping (.read -> .view)
 * @param userPermissions - Array of user permissions
 * @param requiredPermission - Required permission (e.g., "customer.view" or "customer.create")
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

  // Check legacy format mapping (e.g., customer.read -> customer.view)
  const mappedPermission = mapLegacyPermission(requiredPermission);
  if (mappedPermission !== requiredPermission && userPermissions.includes(mappedPermission)) {
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

