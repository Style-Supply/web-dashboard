'use client';

import { useCallback, useEffect, useState } from 'react';
import { request } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  rating: number;
  body: string | null;
  review_type: 'returned' | 'purchased' | null;
  return_reason: string | null;
  loved_reason: string | null;
  disliked_reason: string | null;
  share_publicly: boolean;
  admin_approved_public: boolean;
  created_at: string;
  user_id: string;
  product_id: string;
  profiles: { id: string; full_name: string | null } | null;
  products: { id: string; name: string } | null;
}

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < rating ? 'text-amber-400' : 'text-neutral-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'' | 'returned' | 'purchased'>('');
  const [ratingFilter, setRatingFilter] = useState<'' | '1' | '2' | '3' | '4' | '5'>('');
  const [publicOnly, setPublicOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        ...(typeFilter ? { review_type: typeFilter } : {}),
        ...(ratingFilter ? { rating: ratingFilter } : {}),
        ...(publicOnly ? { public_only: 'true' } : {}),
      });
      const data = await request<{ reviews: Review[]; total: number }>(`/api/admin/reviews?${params}`);
      setReviews(data.reviews);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [offset, typeFilter, ratingFilter, publicOnly]);

  useEffect(() => { void load(); }, [load]);

  // Reset to page 1 on filter change
  useEffect(() => { setOffset(0); }, [typeFilter, ratingFilter, publicOnly]);

  const toggle = async (id: string, currentlyApproved: boolean) => {
    setBusy(id);
    try {
      await request(`/api/admin/reviews/${id}/${currentlyApproved ? 'hide' : 'approve'}`, { method: 'POST' });
      setReviews(prev => prev.map(r => r.id === id ? { ...r, admin_approved_public: !currentlyApproved } : r));
    } catch { /* noop */ } finally {
      setBusy(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="p-6 lg:p-8 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Reviews</h1>
          <p className="text-sm text-neutral-400 mt-0.5">{total} total · approve public reviews before they show on product pages</p>
        </div>
        <button onClick={() => void load()} className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
          className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-white text-neutral-700"
        >
          <option value="">All Types</option>
          <option value="returned">Returned</option>
          <option value="purchased">Purchased</option>
        </select>

        <select
          value={ratingFilter}
          onChange={e => setRatingFilter(e.target.value as typeof ratingFilter)}
          className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-white text-neutral-700"
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} ★</option>)}
        </select>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setPublicOnly(v => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors ${publicOnly ? 'bg-[#7A021D]' : 'bg-neutral-200'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${publicOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-neutral-600 font-medium">Wants to share publicly</span>
        </label>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="px-4 py-3 text-left font-medium text-neutral-500 text-xs uppercase tracking-wider">Member</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-500 text-xs uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-500 text-xs uppercase tracking-wider">Rating</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-500 text-xs uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-500 text-xs uppercase tracking-wider">Reason / Body</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-500 text-xs uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-500 text-xs uppercase tracking-wider">Public</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-500 text-xs uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-neutral-100 rounded w-full" /></td>
                  ))}
                </tr>
              ))
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-neutral-400 text-sm">No reviews found</td>
              </tr>
            ) : reviews.map(r => (
              <tr key={r.id} className="hover:bg-neutral-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-neutral-800 text-xs">{r.profiles?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-600 text-xs max-w-[140px] truncate">{r.products?.name ?? '—'}</td>
                <td className="px-4 py-3"><Stars rating={r.rating} /></td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.review_type === 'returned' ? 'bg-blue-100 text-blue-700' :
                    r.review_type === 'purchased' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-neutral-100 text-neutral-500'
                  }`}>
                    {r.review_type ?? 'legacy'}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600 text-xs max-w-[200px]">
                  {r.return_reason && <p className="truncate">↩ {r.return_reason}</p>}
                  {r.loved_reason && <p className="truncate">❤️ {r.loved_reason}</p>}
                  {r.disliked_reason && <p className="truncate">👎 {r.disliked_reason}</p>}
                  {r.body && <p className="truncate text-neutral-400 italic">{r.body}</p>}
                  {!r.return_reason && !r.loved_reason && !r.disliked_reason && !r.body && <span className="text-neutral-300">—</span>}
                </td>
                <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    {r.share_publicly ? (
                      <span className="text-xs text-emerald-600 font-medium">Wants public</span>
                    ) : (
                      <span className="text-xs text-neutral-400">Private</span>
                    )}
                    {r.admin_approved_public && (
                      <span className="text-xs text-[#7A021D] font-medium">✓ Approved</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {r.share_publicly ? (
                    <button
                      disabled={busy === r.id}
                      onClick={() => void toggle(r.id, r.admin_approved_public)}
                      className={`text-xs font-medium hover:underline disabled:opacity-40 ${
                        r.admin_approved_public ? 'text-neutral-500' : 'text-[#7A021D]'
                      }`}
                    >
                      {busy === r.id ? '…' : r.admin_approved_public ? 'Hide' : 'Approve'}
                    </button>
                  ) : (
                    <span className="text-xs text-neutral-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
          <div>{total} review{total === 1 ? '' : 's'}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg bg-white disabled:opacity-40 hover:bg-neutral-50"
            >
              ← Prev
            </button>
            <span className="text-xs text-neutral-400">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg bg-white disabled:opacity-40 hover:bg-neutral-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
