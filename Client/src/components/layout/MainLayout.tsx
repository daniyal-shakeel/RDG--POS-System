import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function MainLayout({ children }: MainLayoutProps) {
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.innerWidth < 768) return true; 
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={handleToggleCollapse} />
      <div className={cn(
        "transition-all duration-300",
        isSidebarCollapsed ? "ml-16" : "ml-56 xl:ml-64"
      )}>
        <Header />
        <main className="p-4 xl:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
