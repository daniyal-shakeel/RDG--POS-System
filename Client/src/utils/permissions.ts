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
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  // Super Admin has all permissions
  if (userPermissions.includes('*')) {
    return true;
  }

  // Exact match
  if (userPermissions.includes(requiredPermission)) {
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
