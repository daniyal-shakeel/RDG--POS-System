import { useMemo } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { hasPermission as checkPermission } from '@/utils/permissions';





export function usePermissions() {
  const { user } = usePOS();

  const permissions = useMemo(() => {
    return user?.permissions || [];
  }, [user?.permissions]);

  




  const hasPermission = (permission: string): boolean => {
    if (!permissions || permissions.length === 0) {
      return false;
    }
    
    if (permissions.includes('*')) {
      return true;
    }
    return checkPermission(permissions, permission);
  };

  




  const hasAnyPermission = (permissionList: string[]): boolean => {
    if (!permissions || permissions.length === 0) {
      return false;
    }
    
    if (permissions.includes('*')) {
      return true;
    }
    return permissionList.some(permission => checkPermission(permissions, permission));
  };

  




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
