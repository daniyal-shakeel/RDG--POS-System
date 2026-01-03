import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-56 xl:ml-64">
        <Header />
        <main className="p-4 xl:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
