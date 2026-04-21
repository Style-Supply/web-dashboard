'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  '/products': 'Products',
  '/products/new': 'Add Product',
  '/products/batch': 'Batch Upload',
  '/users': 'Users',
};

export default function TopBar(): React.ReactElement {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = PAGE_TITLES[pathname] || (pathname.startsWith('/products/') ? 'Edit Product' : 'Dashboard');

  const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email;
  const initials = name
    ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SS';

  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-6">
      <h1 className="text-sm font-semibold text-[#2C0505]">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-8 w-8 rounded-full bg-[#7A021D] text-white grid place-items-center text-xs font-semibold hover:bg-[#8B1A35] transition-colors"
          >
            {initials}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-neutral-200 bg-white py-1.5 shadow-lg">
                <div className="px-3 py-2 border-b border-neutral-100">
                  <div className="text-sm font-medium text-[#2C0505]">{name ?? 'Admin'}</div>
                  <div className="text-xs text-neutral-500 truncate">{user?.email}</div>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
