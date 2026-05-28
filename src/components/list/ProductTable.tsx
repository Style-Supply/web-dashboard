'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '@/types/product';
import { formatINR } from '@/lib/price';

type BusyAction = 'publishing' | 'unpublishing' | 'duplicating' | 'deleting' | null;

interface ProductTableProps {
  products: Product[];
  selection: Set<string>;
  rowBusy?: string | null;
  busyAction?: BusyAction;
  onSelectionChange: (next: Set<string>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
}

const BUSY_MESSAGES: Record<NonNullable<BusyAction>, string> = {
  publishing: 'Publishing…',
  unpublishing: 'Converting to draft…',
  duplicating: 'Duplicating…',
  deleting: 'Deleting…',
};

export default function ProductTable({
  products,
  selection,
  rowBusy = null,
  busyAction = null,
  onSelectionChange,
  onDuplicate,
  onDelete,
  onPublish,
  onUnpublish,
}: ProductTableProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  function toggle(id: string): void {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  function toggleAll(): void {
    if (selection.size === products.length) onSelectionChange(new Set());
    else onSelectionChange(new Set(products.map((p) => p.id)));
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-[#FDF8F4] text-left text-xs font-semibold text-[#2C0505]/70">
        <tr>
          <th className="px-4 py-3 w-10">
            <input
              type="checkbox"
              checked={products.length > 0 && selection.size === products.length}
              onChange={toggleAll}
              className="rounded border-neutral-300 text-[#7A021D] focus:ring-[#7A021D]"
            />
          </th>
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Brand</th>
          <th className="px-4 py-3">Category</th>
          <th className="px-4 py-3">Retail</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3 w-10" />
        </tr>
      </thead>
      <tbody className="bg-white">
        {products.map((p) => (
          <tr key={p.id} className={`border-t border-neutral-100 hover:bg-[#FDF8F4]/50 transition-colors ${rowBusy === p.id ? 'opacity-50 pointer-events-none' : ''}`}>
            <td className="px-4 py-3">
              <input
                type="checkbox"
                checked={selection.has(p.id)}
                onChange={() => toggle(p.id)}
                className="rounded border-neutral-300 text-[#7A021D] focus:ring-[#7A021D]"
              />
            </td>
            <td className="px-4 py-3">
              <Link href={`/products/${p.id}`} className="font-medium text-[#2C0505] hover:text-[#7A021D] transition-colors">
                {p.name}
              </Link>
            </td>
            <td className="px-4 py-3 text-[#2C0505]/70">{p.brand ?? '—'}</td>
            <td className="px-4 py-3 text-[#2C0505]/70">{p.category ?? '—'}</td>
            <td className="px-4 py-3 text-[#2C0505]/70">{formatINR(p.retail_price_minor)}</td>
            <td className="px-4 py-3">
              {rowBusy === p.id && busyAction ? (
                <span className="inline-flex items-center gap-1.5 text-neutral-500 text-xs">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {BUSY_MESSAGES[busyAction]}
                </span>
              ) : (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  p.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {p.status}
                </span>
              )}
            </td>
            <td className="relative px-4 py-3 text-right">
              <button
                type="button"
                onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <svg className="w-5 h-5 text-[#2C0505]/50" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="6" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="18" r="1.5" />
                </svg>
              </button>
              {menuOpen === p.id && (
                <div className="absolute right-2 top-10 z-10 w-40 rounded-lg border border-neutral-200 bg-white py-1.5 shadow-lg">
                  <Link href={`/products/${p.id}`} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#FDF8F4]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Link>
                  <div className="my-1.5 border-t border-neutral-100" />
                  {p.status === 'published' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(null);
                        onUnpublish(p.id);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-[#FDF8F4] text-amber-600 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Convert to Draft
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(null);
                        onPublish(p.id);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-[#FDF8F4] text-[#7A021D] font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Publish
                    </button>
                  )}
                  <div className="my-1.5 border-t border-neutral-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(null);
                      onDuplicate(p.id);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-[#FDF8F4]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(null);
                      onDelete(p.id);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
