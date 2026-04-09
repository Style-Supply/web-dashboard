'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  {
    href: '/products',
    label: 'Products',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: '/products/new',
    label: 'Add Product',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    href: '/products/batch',
    label: 'Batch Upload',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
];

export default function Sidebar(): React.ReactElement {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${collapsed ? 'w-[72px]' : 'w-60'} shrink-0 bg-[#2C0505] text-white flex flex-col transition-all duration-300`}
    >
      {/* Logo and toggle */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-5 py-5 border-b border-white/10`}>
        {!collapsed && (
          <Link href="/products" className="flex items-center">
            <Image src="/icon/Frame.svg" alt="StyleSupply" width={32} height={32} className="brightness-0 invert" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 opacity-60 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 flex flex-col gap-1 ${collapsed ? 'px-2' : 'px-3'} py-4`}>
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === '/products' &&
              pathname.startsWith('/products/') &&
              !['/products/new', '/products/batch'].includes(pathname));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#7A021D] text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
