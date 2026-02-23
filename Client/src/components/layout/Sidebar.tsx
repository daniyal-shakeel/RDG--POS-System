import { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  CreditCard,
  RotateCcw,
  FileCheck,
  Users,
  Package,
  Truck,
  Settings,
  LogOut,
  Smartphone,
  Printer,
  PanelLeftClose,
  PanelLeftOpen,
  UserCog
} from 'lucide-react';
import { usePOS } from '@/contexts/POSContext';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

const navItemsConfig = [
  { 
    path: '/', 
    label: 'Dashboard', 
    icon: LayoutDashboard,
    permissions: [
      'dashboard.view',
      'invoice.view', 'invoice.*',
      'receipt.view', 'receipt.*',
      'customer.view', 'customer.*',
      'creditNote.view', 'creditNote.*',
      'refund.view', 'refund.*',
      'estimate.view', 'estimate.*'
    ] 
  },
  { 
    path: '/invoices', 
    label: 'Invoices', 
    icon: FileText,
    permissions: ['invoice.view', 'invoice.*']
  },
  { 
    path: '/receipts', 
    label: 'Receipts', 
    icon: Receipt,
    permissions: ['receipt.view', 'receipt.*']
  },
  { 
    path: '/credit-notes', 
    label: 'Credit Notes', 
    icon: CreditCard,
    permissions: ['creditNote.view', 'creditNote.*']
  },
  { 
    path: '/refunds', 
    label: 'Refunds', 
    icon: RotateCcw,
    permissions: ['refund.view', 'refund.*']
  },
  { 
    path: '/estimates', 
    label: 'Estimates', 
    icon: FileCheck,
    permissions: ['estimate.view', 'estimate.*']
  },
  { 
    path: '/customers', 
    label: 'Customers', 
    icon: Users,
    permissions: ['customer.view', 'customer.*']
  },
  { 
    path: '/users', 
    label: 'Users', 
    icon: UserCog,
    permissions: ['user.manage']
  },
  { 
    path: '/inventory', 
    label: 'Inventory', 
    icon: Package,
    permissions: ['inventory.view', 'inventory.*', 'product.view', 'product.*']
  },
  {
    path: '/shipments',
    label: 'Shipments',
    icon: Truck,
    permissions: ['mrpeasy.view', 'mrpeasy.*', 'inventory.view', 'inventory.*']
  },
  { 
    path: '/settings', 
    label: 'Settings', 
    icon: Settings,
    permissions: ['settings.view'] 
  }
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, deviceStatus } = usePOS();
  const { hasAnyPermission } = usePermissions();

  const handleLogout = () => {
    
    navigate('/login', { replace: true });
    
    logout().catch(() => {
      
    });
  };

  
  const navItems = useMemo(() => {
    if (!user) {
      return [];
    }

    const userPermissions = user?.permissions || [];
    const userRole = user?.role;
    const originalRole = user?.originalRole;
    
    
    
    const isSuperAdmin = 
      userPermissions.includes('*') || 
      originalRole === 'Super Admin';
    
    
    if (isSuperAdmin) {
      return navItemsConfig;
    }
    
    
    return navItemsConfig.filter(item => {
      
      if (!item.permissions || item.permissions.length === 0) {
        return true;
      }
      
      
      return hasAnyPermission(item.permissions);
    });
  }, [hasAnyPermission, user]);

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-56 xl:w-64"
    )}>
      {}
      <div className="p-4 xl:p-4 border-b border-sidebar-border flex items-center justify-between">
        {!isCollapsed && (
          <>
            <div className="flex-1">
              <h1 className="font-display text-lg xl:text-xl font-bold text-gradient">
                XYZ Company Ltd.
              </h1>
              <p className="text-xs text-muted-foreground mt-1">POS System</p>
            </div>
          </>
        )}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors",
            isCollapsed && "mx-auto"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>

      {}
      {!isCollapsed && (
        <div className="px-3 xl:px-4 py-2 xl:py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-3 xl:gap-4 text-xs">
            <div className="flex items-center gap-1.5 xl:gap-2">
              <Smartphone className="h-3 w-3 xl:h-3.5 xl:w-3.5" />
              <span className="text-muted-foreground hidden xl:inline">CT60</span>
              <span className={cn(
                "h-2 w-2 rounded-full",
                deviceStatus.ct60 === 'connected' && "bg-success animate-pulse-glow",
                deviceStatus.ct60 === 'scanning' && "bg-warning animate-pulse",
                deviceStatus.ct60 === 'disconnected' && "bg-destructive"
              )} />
            </div>
            <div className="flex items-center gap-1.5 xl:gap-2">
              <Printer className="h-3 w-3 xl:h-3.5 xl:w-3.5" />
              <span className="text-muted-foreground hidden xl:inline">RP4</span>
              <span className={cn(
                "h-2 w-2 rounded-full",
                deviceStatus.rp4 === 'connected' && "bg-success animate-pulse-glow",
                deviceStatus.rp4 === 'printing' && "bg-info animate-pulse",
                deviceStatus.rp4 === 'disconnected' && "bg-destructive"
              )} />
            </div>
          </div>
        </div>
      )}

      {}
      <nav className="flex-1  p-3 xl:p-4 space-y-0.5 xl:space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 xl:gap-3 px-3 xl:px-4 py-2 rounded-lg text-xs xl:text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {}
      {!isCollapsed && (
        <div className="p-3 xl:p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 xl:gap-3 mb-2 xl:mb-3">
            <div className="h-8 w-8 xl:h-10 xl:w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-semibold text-xs xl:text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs xl:text-sm font-medium truncate">
                {user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : 'Guest'}
              </p>
              <p className="text-[10px] xl:text-xs text-muted-foreground capitalize">
                {user?.originalRole || (() => {
                  if (!user?.role) return 'Not logged in';
                  
                  const roleDisplayMap: Record<string, string> = {
                    'super_admin': 'Super Admin',
                    'admin': 'Admin',
                    'sales_rep': 'Sales Representative',
                    'stock_keeper': 'Stock Keeper',
                  };
                  return roleDisplayMap[user.role] || user.role.replace('_', ' ');
                })()}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 xl:px-4 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
