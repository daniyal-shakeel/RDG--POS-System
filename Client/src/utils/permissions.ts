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
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  // Super Admin has all permissions - always return true
  if (userPermissions.includes('*')) {
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
  const permissionParts = requiredPermission.split('.');
  if (permissionParts.length >= 2) {
    const wildcardPermission = `${permissionParts[0]}.*`;
    if (userPermissions.includes(wildcardPermission)) {
      return true;
    }
  }

  return false;
};

/**
 * Extracts all permission keys from roles array
 * @param roles - Array of role objects with permissionKeys
 * @returns Flattened array of all permission keys
 */
export const extractPermissionsFromRoles = (roles: Array<{ permissionKeys?: string[] }>): string[] => {
  if (!roles || !Array.isArray(roles)) {
    return [];
  }

  const permissions: string[] = [];
  roles.forEach(role => {
    if (role.permissionKeys && Array.isArray(role.permissionKeys)) {
      permissions.push(...role.permissionKeys);
    }
  });

  // Remove duplicates
  return [...new Set(permissions)];
};
