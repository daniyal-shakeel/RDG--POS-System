import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import { UserRole } from '@/types/pos';
import { hasPermission } from '@/utils/permissions';


let hasCompletedInitialAuth = false;
const AUTH_USER_CACHE_KEY = 'auth_user_cache';

function getCachedAuthUser(): AuthResponse['user'] | null {
  try {
    const cached = sessionStorage.getItem(AUTH_USER_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

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
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const cachedUser = hasCompletedInitialAuth && token ? getCachedAuthUser() : null;
  const [isLoading, setIsLoading] = useState(!!token && !cachedUser);
  const [isAuthenticated, setIsAuthenticated] = useState(!!cachedUser);
  const [user, setUser] = useState<AuthResponse['user'] | null>(cachedUser);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        
        if (!hasCompletedInitialAuth) {
          setIsLoading(true);
        }

        
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          hasCompletedInitialAuth = false; 
          sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
          return;
        }

        
        const response = await api.get<AuthResponse>('/check-auth');
        
        if (response.data.authenticated && response.data.user) {
          setIsAuthenticated(true);
          setUser(response.data.user);
          sessionStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(response.data.user));
        } else {
          setIsAuthenticated(false);
          sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error: any) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
        hasCompletedInitialAuth = true;
      }
    };

    checkAuth();
  }, [location.pathname]);

  
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

  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  
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
      return hasPermission(userPermissions, required);
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

  
  return <>{children}</>;
}


function mapBackendRoleToFrontendRole(backendRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'Super Admin': 'super_admin',
    'Admin': 'admin',
    'Sales Representative': 'sales_rep',
    'Sales Rep': 'sales_rep',
    'Stock-Keeper': 'stock_keeper',
    'Stock Keeper': 'stock_keeper',
  };
  
  
  const normalizedRole = backendRole.replace(/_/g, ' ');
  return roleMap[normalizedRole] || roleMap[backendRole] || 'sales_rep';
}
