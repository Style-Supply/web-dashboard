'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useRef, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProductsProvider } from '@/context/ProductsContext';
import { ToastProvider } from '@/components/ui/Toast';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

function AuthenticatedLayout({ children }: { children: ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const { isLoading, isAuthenticated, user } = useAuth();

  // Track if user was ever authenticated to prevent flicker during session refresh
  const wasAuthenticated = useRef(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticated.current = true;
      setShowContent(true);
    } else if (!isLoading && !wasAuthenticated.current) {
      // Only hide content if we've finished loading and were never authenticated
      setShowContent(false);
    }
    // If we were authenticated but now aren't (and not loading),
    // give a brief grace period before hiding content to handle session refresh
    if (!isLoading && !isAuthenticated && wasAuthenticated.current) {
      const timeout = setTimeout(() => {
        if (!user) {
          wasAuthenticated.current = false;
          setShowContent(false);
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, isAuthenticated, user]);

  // Login page - no shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Loading state (only on initial load)
  if (isLoading && !wasAuthenticated.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F3]">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  // Not authenticated and never was - will redirect via AuthContext
  if (!showContent && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F3]">
        <div className="text-neutral-500">Redirecting...</div>
      </div>
    );
  }

  // Authenticated or was recently authenticated - show full layout
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
