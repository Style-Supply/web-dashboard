'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavChild {
  href: string;
  label: string;
}

interface NavGroup {
  href: string;
  label: string;
  icon: React.ReactNode;
  children: NavChild[];
}

const NAV: NavGroup[] = [
  {
    href: '/products',
    label: 'Products',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    children: [
      { href: '/products/new', label: 'Add Product' },
      { href: '/products/batch', label: 'Batch Upload' },
    ],
  },
  {
    href: '/users',
    label: 'Users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H2v-2a4 4 0 013-3.87m10-4a4 4 0 10-8 0 4 4 0 008 0zm6-4a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    children: [{ href: '/users/new', label: 'Add User' }],
  },
  {
    href: '/boxes',
    label: 'Boxes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
    children: [],
  },
  {
    href: '/memberships',
    label: 'Memberships',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    children: [],
  },
  {
    href: '/codes',
    label: 'Access Codes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
    children: [],
  },
];

export default function Sidebar(): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of NAV) {
      if (pathname.startsWith(g.href)) initial[g.href] = true;
    }
    return initial;
  });

  useEffect(() => {
    // Auto-expand the group that owns the current route.
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const g of NAV) {
        if (pathname.startsWith(g.href)) next[g.href] = true;
      }
      return next;
    });
  }, [pathname]);

  function isGroupActive(group: NavGroup): boolean {
    return pathname === group.href || pathname.startsWith(`${group.href}/`);
  }

  function handleGroupClick(group: NavGroup, e: React.MouseEvent): void {
    // On the group row: open/close the dropdown AND navigate to the index route.
    // If already on the index, just toggle the dropdown.
    e.preventDefault();
    if (collapsed) {
      router.push(group.href);
      return;
    }
    setOpenGroups((prev) => ({ ...prev, [group.href]: !prev[group.href] }));
    if (pathname !== group.href) {
      router.push(group.href);
    }
  }

  return (
    <aside
      className={`${collapsed ? 'w-[72px]' : 'w-60'} shrink-0 bg-[#2C0505] text-white flex flex-col transition-all duration-300`}
    >
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

      <nav className={`flex-1 flex flex-col gap-1 ${collapsed ? 'px-2' : 'px-3'} py-4`}>
        {NAV.map((group) => {
          const groupActive = isGroupActive(group);
          const open = !collapsed && !!openGroups[group.href];
          return (
            <div key={group.href} className="flex flex-col">
              <a
                href={group.href}
                onClick={(e) => handleGroupClick(group, e)}
                title={collapsed ? group.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  groupActive
                    ? 'bg-[#7A021D] text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                {group.icon}
                {!collapsed && (
                  <>
                    <span className="flex-1">{group.label}</span>
                    {group.children.length > 0 && (
                      <svg
                        className={`w-4 h-4 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </>
                )}
              </a>
              {open && group.children.length > 0 && (
                <div className="mt-1 ml-4 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                  {group.children.map((child) => {
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          childActive
                            ? 'bg-[#7A021D] text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
