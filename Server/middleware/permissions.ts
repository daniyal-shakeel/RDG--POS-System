import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";








const mapLegacyPermission = (permission: string): string => {
  
  if (permission.endsWith('.read')) {
    return permission.replace('.read', '.view');
  }
  
  if (permission.includes('credit_note')) {
    return permission.replace('credit_note', 'creditNote');
  }
  return permission;
};











export const hasPermission = (
  userPermissions: string[],
  requiredPermission: string
): boolean => {
  
  if (userPermissions.includes("*")) {
    return true;
  }

  
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  
  const mappedPermission = mapLegacyPermission(requiredPermission);
  if (mappedPermission !== requiredPermission && userPermissions.includes(mappedPermission)) {
    return true;
  }

  
  const permissionParts = requiredPermission.split(".");
  if (permissionParts.length >= 2) {
    const wildcardPermission = `${permissionParts[0]}.*`;
    if (userPermissions.includes(wildcardPermission)) {
      return true;
    }
  }

  return false;
};





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

