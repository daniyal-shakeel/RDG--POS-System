import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import { UserRole } from '@/types/pos';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: string | string[];
}

interface AuthResponse {
  status: 'ok' | 'error';
  message: string;
  authenticated: boolean;
  user?: {
    email: string;
    role: string;
    userId: string;
    permissions: string[];
  };
  timestamp: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
}: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);

        // Check if token exists in localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Call check-auth endpoint
        const response = await api.get<AuthResponse>('/check-auth');
        
        if (response.data.authenticated && response.data.user) {
          setIsAuthenticated(true);
          setUser(response.data.user);
        } else {
          setIsAuthenticated(false);
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error: any) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [location.pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if required
  if (requiredRole && user) {
    const userRole = mapBackendRoleToFrontendRole(user.role);
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!allowedRoles.includes(userRole)) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <div className="mb-4 text-6xl">🔒</div>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page. Required role: {Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}
            </p>
            <p className="text-sm text-muted-foreground">
              Your current role: {userRole}
            </p>
          </div>
        </div>
      );
    }
  }

  // Check permission authorization if required
  if (requiredPermission && user) {
    const userPermissions = user.permissions || [];
    const requiredPermissions = Array.isArray(requiredPermission) 
      ? requiredPermission 
      : [requiredPermission];
    
    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(required => {
      // Check exact match
      if (userPermissions.includes(required)) return true;
      
      // Check wildcard permissions (e.g., "customer.*" matches "customer.read")
      const wildcardMatch = userPermissions.some(perm => {
        if (perm === '*') return true; // Super admin
        if (perm.endsWith('.*')) {
          const prefix = perm.slice(0, -2);
          return required.startsWith(prefix + '.');
        }
        return false;
      });
      
      return wildcardMatch;
    });

    if (!hasAllPermissions) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <div className="mb-4 text-6xl">🔒</div>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You don't have the required permissions to access this page.
            </p>
            <p className="text-sm text-muted-foreground">
              Required: {requiredPermissions.join(', ')}
            </p>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

// Helper function to map backend role to frontend UserRole
function mapBackendRoleToFrontendRole(backendRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'Super Admin': 'admin',
    'Admin': 'admin',
    'Manager': 'manager',
    'Sales Rep': 'sales_rep',
    'Sales Representative': 'sales_rep',
    'Warehouse': 'warehouse',
    'Stock-Keeper': 'warehouse',
  };
  
  // Normalize role name (remove underscores, handle variations)
  const normalizedRole = backendRole.replace(/_/g, ' ');
  return roleMap[normalizedRole] || roleMap[backendRole] || 'sales_rep';
}
