import { useMemo } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { hasPermission as checkPermission } from '@/utils/permissions';

/**
 * Hook to check user permissions
 * @returns Object with permission checking functions
 */
export function usePermissions() {
  const { user } = usePOS();

  const permissions = useMemo(() => {
    return user?.permissions || [];
  }, [user?.permissions]);

  /**
   * Check if user has a specific permission
   * @param permission - Permission to check (e.g., "customer.create")
   * @returns true if user has the permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!permissions || permissions.length === 0) {
      return false;
    }
    return checkPermission(permissions, permission);
  };

  /**
   * Check if user has any of the specified permissions
   * @param permissionList - Array of permissions to check
   * @returns true if user has at least one of the permissions
   */
  const hasAnyPermission = (permissionList: string[]): boolean => {
    if (!permissions || permissions.length === 0) {
      return false;
    }
    return permissionList.some(permission => checkPermission(permissions, permission));
  };

  /**
   * Check if user has all of the specified permissions
   * @param permissionList - Array of permissions to check
   * @returns true if user has all of the permissions
   */
  const hasAllPermissions = (permissionList: string[]): boolean => {
    if (!permissions || permissions.length === 0) {
      return false;
    }
    return permissionList.every(permission => checkPermission(permissions, permission));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
