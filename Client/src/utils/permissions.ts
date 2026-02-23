






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
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  
  if (userPermissions.includes('*')) {
    return true;
  }

  
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  
  const mappedPermission = mapLegacyPermission(requiredPermission);
  if (mappedPermission !== requiredPermission && userPermissions.includes(mappedPermission)) {
    return true;
  }

  
  const permissionParts = requiredPermission.split('.');
  if (permissionParts.length >= 2) {
    const wildcardPermission = `${permissionParts[0]}.*`;
    if (userPermissions.includes(wildcardPermission)) {
      return true;
    }
  }

  return false;
};






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

  
  return [...new Set(permissions)];
};
