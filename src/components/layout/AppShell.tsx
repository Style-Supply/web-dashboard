'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProductsProvider } from '@/context/ProductsContext';
import { ToastProvider } from '@/components/ui/Toast';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

function AuthenticatedLayout({ children }: { children: ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAuth();

  // Login page - no shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F3]">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  // Not authenticated - will redirect via AuthContext
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F3]">
        <div className="text-neutral-500">Redirecting...</div>
      </div>
    );
  }

  // Authenticated - show full layout
  return (
    <ProductsProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ProductsProvider>
  );
}

export default function AppShell({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </ToastProvider>
    </AuthProvider>
  );
}
