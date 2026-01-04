import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  CreditCard,
  RotateCcw,
  FileCheck,
  Users,
  Package,
  Settings,
  LogOut,
  Smartphone,
  Printer
} from 'lucide-react';
import { usePOS } from '@/contexts/POSContext';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/receipts', label: 'Receipts', icon: Receipt },
  { path: '/credit-notes', label: 'Credit Notes', icon: CreditCard },
  { path: '/refunds', label: 'Refunds', icon: RotateCcw },
  { path: '/estimates', label: 'Estimates', icon: FileCheck },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/settings', label: 'Settings', icon: Settings }
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout, deviceStatus } = usePOS();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 xl:w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-4 xl:p-6 border-b border-sidebar-border">
        <h1 className="font-display text-lg xl:text-xl font-bold text-gradient">
          XYZ Company Ltd.
        </h1>
        <p className="text-xs text-muted-foreground mt-1">POS System</p>
      </div>

      {/* Device Status */}
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 xl:p-4 space-y-0.5 xl:space-y-1">
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
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 xl:p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 xl:gap-3 mb-2 xl:mb-3">
          <div className="h-8 w-8 xl:h-10 xl:w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-semibold text-xs xl:text-sm">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs xl:text-sm font-medium truncate">{user?.name || 'Guest'}</p>
            <p className="text-[10px] xl:text-xs text-muted-foreground capitalize">
              {user?.role?.replace('_', ' ') || 'Not logged in'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 xl:px-4 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
