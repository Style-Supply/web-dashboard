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
  /** Virtual groups have no own page; clicking expands them or jumps to first child. */
  virtual?: boolean;
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const Icon = {
  Products: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </svg>
  ),
  Catalog: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  Brands: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" />
    </svg>
  ),
  Collections: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <path d="m12.83 2.18-9.74 4.42a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83l-9.08-4.42z" />
      <path d="M2 12.5 11.17 17a2 2 0 0 0 1.66 0L22 12.5" />
      <path d="M2 17.5 11.17 22a2 2 0 0 0 1.66 0L22 17.5" />
    </svg>
  ),
  Categories: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Materials: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </svg>
  ),
  Colours: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <path d="M13.5 2C7.97 2 3.5 6.47 3.5 12s4.47 10 10 10c1.65 0 3-1.35 3-3v-1c0-.55.45-1 1-1h1.5c2.49 0 4.5-2.01 4.5-4.5C23.5 6.36 19.14 2 13.5 2z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="9" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Locations: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Users: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Boxes: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </svg>
  ),
  Memberships: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  ),
  AccessCodes: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" {...stroke}>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  ),
  Chevron: (
    <svg className="w-4 h-4 opacity-70" viewBox="0 0 24 24" {...stroke}>
      <path d="M19 9l-7 7-7-7" />
    </svg>
  ),
};

const NAV: NavGroup[] = [
  {
    href: '/products',
    label: 'Products',
    icon: Icon.Products,
    children: [
      { href: '/products/new', label: 'Add Product' },
      { href: '/products/batch', label: 'Batch Upload' },
    ],
  },
  {
    href: '/catalog',
    label: 'Catalog',
    icon: Icon.Catalog,
    virtual: true,
    children: [
      { href: '/brands', label: 'Brands' },
      { href: '/collections', label: 'Collections' },
      { href: '/categories', label: 'Categories' },
      { href: '/materials', label: 'Materials' },
      { href: '/colours', label: 'Colours' },
      { href: '/locations', label: 'Locations' },
    ],
  },
  {
    href: '/users',
    label: 'Users',
    icon: Icon.Users,
    children: [{ href: '/users/new', label: 'Add User' }],
  },
  { href: '/boxes', label: 'Boxes', icon: Icon.Boxes, children: [] },
  { href: '/memberships', label: 'Memberships', icon: Icon.Memberships, children: [] },
  { href: '/codes', label: 'Access Codes', icon: Icon.AccessCodes, children: [] },
];

function isPathInGroup(group: NavGroup, pathname: string): boolean {
  if (!group.virtual && (pathname === group.href || pathname.startsWith(`${group.href}/`))) {
    return true;
  }
  return group.children.some(
    (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
  );
}

export default function Sidebar(): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of NAV) {
      if (isPathInGroup(g, pathname)) initial[g.href] = true;
    }
    return initial;
  });

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const g of NAV) {
        if (isPathInGroup(g, pathname)) next[g.href] = true;
      }
      return next;
    });
  }, [pathname]);

  function handleGroupClick(group: NavGroup, e: React.MouseEvent): void {
    e.preventDefault();

    if (collapsed) {
      // In collapsed mode, virtual groups jump to their first child.
      const target = group.virtual ? group.children[0]?.href ?? group.href : group.href;
      router.push(target);
      return;
    }

    setOpenGroups((prev) => ({ ...prev, [group.href]: !prev[group.href] }));

    // Non-virtual groups also navigate to their index route on click.
    if (!group.virtual && pathname !== group.href) {
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
            viewBox="0 0 24 24"
            {...stroke}
          >
            <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav className={`flex-1 flex flex-col gap-1 ${collapsed ? 'px-2' : 'px-3'} py-4`}>
        {NAV.map((group) => {
          const groupActive = isPathInGroup(group, pathname);
          // For non-virtual groups, only highlight the parent row if the user is exactly on its index page.
          const parentRowActive = group.virtual
            ? false
            : pathname === group.href || (group.children.length === 0 && pathname.startsWith(`${group.href}/`));
          const open = !collapsed && !!openGroups[group.href];
          return (
            <div key={group.href} className="flex flex-col">
              <a
                href={group.href}
                onClick={(e) => handleGroupClick(group, e)}
                title={collapsed ? group.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  parentRowActive
                    ? 'bg-[#7A021D] text-white'
                    : groupActive
                    ? 'text-white hover:bg-white/10'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                {group.icon}
                {!collapsed && (
                  <>
                    <span className="flex-1">{group.label}</span>
                    {group.children.length > 0 && (
                      <span
                        className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                      >
                        {Icon.Chevron}
                      </span>
                    )}
                  </>
                )}
              </a>
              {open && group.children.length > 0 && (
                <div className="mt-1 ml-4 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                  {group.children.map((child) => {
                    const childActive =
                      pathname === child.href || pathname.startsWith(`${child.href}/`);
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
