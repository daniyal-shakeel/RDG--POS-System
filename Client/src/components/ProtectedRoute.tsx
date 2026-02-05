import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import { UserRole } from '@/types/pos';
import { hasPermission } from '@/utils/permissions';

// Persists across route changes so we don't show loading when switching tabs/routes
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
  // When switching routes: use cached auth to avoid loading flash; check-auth runs in background
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const cachedUser = hasCompletedInitialAuth && token ? getCachedAuthUser() : null;
  const [isLoading, setIsLoading] = useState(!!token && !cachedUser);
  const [isAuthenticated, setIsAuthenticated] = useState(!!cachedUser);
  const [user, setUser] = useState<AuthResponse['user'] | null>(cachedUser);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Only show loading on very first app load - run check-auth silently when switching tabs/routes
        if (!hasCompletedInitialAuth) {
          setIsLoading(true);
        }

        // Check if token exists in localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          hasCompletedInitialAuth = false; // Reset so next login shows loading on first check
          sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
          return;
        }

        // Call check-auth endpoint (runs behind the scenes on tab/route changes)
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

  // Show loading only on very first load - never when switching tabs/routes
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

  // User is authenticated and authorized
  return <>{children}</>;
}

// Helper function to map backend role to frontend UserRole
function mapBackendRoleToFrontendRole(backendRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'Super Admin': 'super_admin',
    'Admin': 'admin',
    'Sales Representative': 'sales_rep',
    'Sales Rep': 'sales_rep',
    'Stock-Keeper': 'stock_keeper',
    'Stock Keeper': 'stock_keeper',
  };
  
  // Normalize role name (remove underscores, handle variations)
  const normalizedRole = backendRole.replace(/_/g, ' ');
  return roleMap[normalizedRole] || roleMap[backendRole] || 'sales_rep';
}
