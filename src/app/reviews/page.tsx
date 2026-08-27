'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { listReviews, setReviewPublic, type Review } from '@/lib/reviews';

function Hearts({ rating }: { rating: number }): React.ReactElement {
  return (
    <span className="text-[#7A021D] font-bold text-sm tracking-widest" aria-label={`${rating} of 5`}>
      {'♥'.repeat(rating)}
      <span className="text-neutral-200">{'♥'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

function userInitials(name?: string | null): string {
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

function IconGrid({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-[#7A021D]' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={1.8} />
    </svg>
  );
}

function IconList({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-[#7A021D]' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function ReviewsPage(): React.ReactElement {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'' | 'returned' | 'purchased'>('');
  const [ratingFilter, setRatingFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [busy, setBusy] = useState<string | null>(null);

  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { reviews } = await listReviews({
        review_type: typeFilter || undefined,
        rating: ratingFilter ? Number(ratingFilter) : undefined,
      });
      setReviews(reviews);
      if (selectedReview) {
        const updated = reviews.find((r) => r.id === selectedReview.id);
        if (updated) setSelectedReview(updated);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, ratingFilter, showToast, selectedReview]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredReviews = useMemo(() => {
    if (!search.trim()) return reviews;
    const query = search.toLowerCase();
    return reviews.filter(
      (r) =>
        r.products?.name?.toLowerCase().includes(query) ||
        r.profiles?.full_name?.toLowerCase().includes(query) ||
        (r.body && r.body.toLowerCase().includes(query)) ||
        (r.loved_reason && r.loved_reason.toLowerCase().includes(query)),
    );
  }, [reviews, search]);

  // KPI Metrics
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return '0.0';
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const publicApprovedCount = useMemo(
    () => reviews.filter((r) => r.admin_approved_public).length,
    [reviews],
  );

  const purchasedCount = useMemo(
    () => reviews.filter((r) => r.review_type === 'purchased').length,
    [reviews],
  );

  async function handleToggle(review: Review): Promise<void> {
    setBusy(review.id);
    try {
      await setReviewPublic(review.id, !review.admin_approved_public);
      showToast('success', review.admin_approved_public ? 'Removed from public display' : 'Approved for public display');
      if (selectedReview?.id === review.id) {
        setSelectedReview((prev) => prev ? { ...prev, admin_approved_public: !review.admin_approved_public } : null);
      }
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update review status');
    } finally {
      setBusy(null);
    }
  }

  const TYPE_TABS = [
    { id: '', label: 'All Reviews' },
    { id: 'purchased', label: 'Purchased Items' },
    { id: 'returned', label: 'Returned Items' },
  ];

  return (
    <div className="min-h-full bg-neutral-50 p-6">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C0505]">Customer Reviews</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            Moderate member feedback, product ratings, and public storefront testimonials
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 shadow-xs"
          >
            <svg
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Reviews</p>
          <p className="mt-2 text-2xl font-extrabold text-[#2C0505]">{reviews.length}</p>
          <p className="mt-1 text-xs text-neutral-500">Member feedback entries</p>
        </div>
        <div className="rounded-2xl border border-[#7A021D]/20 bg-[#FDF8F4] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7A021D]">Average Rating</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-2xl font-extrabold text-[#7A021D]">{avgRating}</p>
            <span className="text-sm font-bold text-[#7A021D]">♥</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">Out of 5.0 hearts score</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Publicly Approved</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">{publicApprovedCount}</p>
          <p className="mt-1 text-xs text-emerald-600">Displayed on product pages</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Purchased Reviews</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-900">{purchasedCount}</p>
          <p className="mt-1 text-xs text-amber-600">Items bought after rental</p>
        </div>
      </div>

      {/* ── Toolbar: Type Tabs, Rating & Search ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Type Filter Tabs */}
        <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-xs">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id as '' | 'returned' | 'purchased')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                typeFilter === tab.id
                  ? 'bg-[#7A021D] text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Rating Filter & Search */}
        <div className="flex items-center gap-3">
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs outline-none"
          >
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} {r === 1 ? 'Heart' : 'Hearts'}
              </option>
            ))}
          </select>

          <div className="relative max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member, product or comment…"
              className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D]"
            />
          </div>

          <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-xs">
            <button
              onClick={() => setView('grid')}
              title="Grid view"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                view === 'grid' ? 'bg-[#FDF8F4] shadow-xs' : 'hover:bg-neutral-50'
              }`}
            >
              <IconGrid active={view === 'grid'} />
            </button>
            <button
              onClick={() => setView('list')}
              title="List view"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                view === 'list' ? 'bg-[#FDF8F4] shadow-xs' : 'hover:bg-neutral-50'
              }`}
            >
              <IconList active={view === 'list'} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Skeleton Loading ── */}
      {loading && view === 'grid' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-neutral-200 animate-pulse" />
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════
          GRID VIEW
      ══════════════════════════════════════ */}
      {!loading && filteredReviews.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReviews.map((r) => {
            const reviewContent = r.body || r.loved_reason || r.disliked_reason || r.return_reason || 'No written review text provided.';
            return (
              <div
                key={r.id}
                onClick={() => setSelectedReview(r)}
                className={`group relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-[#7A021D]/30 transition-all cursor-pointer ${
                  busy === r.id ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div>
                  {/* Top Bar: Member Initials, Name & Rating */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FDF8F4] text-[#7A021D] font-bold text-xs border border-[#7A021D]/20 shadow-xs">
                        {userInitials(r.profiles?.full_name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#2C0505] truncate">
                          {r.profiles?.full_name ?? 'Anonymous Member'}
                        </h3>
                        <p className="text-xs text-[#7A021D] font-semibold truncate max-w-[180px]">
                          📦 {r.products?.name ?? 'General Review'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        r.review_type === 'purchased'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {r.review_type ? r.review_type.toUpperCase() : 'REVIEW'}
                    </span>
                  </div>

                  {/* Rating Stars / Hearts */}
                  <div className="mt-3 flex items-center gap-2">
                    <Hearts rating={r.rating} />
                    <span className="text-xs font-bold text-[#2C0505]">{r.rating}.0 / 5.0</span>
                  </div>

                  {/* Review Quote Content Box */}
                  <div className="mt-3 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3 text-xs text-neutral-700 leading-relaxed italic line-clamp-3">
                    &ldquo;{reviewContent}&rdquo;
                  </div>
                </div>

                {/* Actions & Public Toggle Footer */}
                <div
                  className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-neutral-400">
                    {r.share_publicly ? 'Requested Public' : 'Private Review'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReview(r)}
                      className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                    >
                      Details
                    </button>
                    {r.share_publicly ? (
                      <button
                        disabled={busy === r.id}
                        onClick={() => void handleToggle(r)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                          r.admin_approved_public
                            ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                            : 'border border-[#7A021D] text-[#7A021D] bg-[#FDF8F4] hover:bg-[#7A021D] hover:text-white'
                        }`}
                      >
                        {r.admin_approved_public ? '✓ Public Approved' : 'Approve for Storefront'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════
          LIST TABLE VIEW
      ══════════════════════════════════════ */}
      {view === 'list' && (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50/80 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-5 py-3.5">Product</th>
                <th className="px-5 py-3.5">Member</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Rating</th>
                <th className="px-5 py-3.5">Review Content</th>
                <th className="px-5 py-3.5">Sharing</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-neutral-400">Loading reviews…</td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-neutral-400">No reviews found</td>
                </tr>
              ) : (
                filteredReviews.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedReview(r)}
                    className="hover:bg-neutral-50/90 transition-colors align-top cursor-pointer group"
                  >
                    <td className="px-5 py-4 font-bold text-[#2C0505]">
                      <div className="flex flex-col">
                        <span>{r.products?.name ?? '—'}</span>
                        {r.products?.brand && (
                          <span className="text-[11px] font-normal text-neutral-400">{r.products.brand}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FDF8F4] text-[#7A021D] font-bold text-[10px] border border-[#7A021D]/20">
                          {userInitials(r.profiles?.full_name)}
                        </div>
                        <span className="font-medium text-neutral-700">{r.profiles?.full_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          r.review_type === 'purchased'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {r.review_type ? r.review_type.toUpperCase() : 'REVIEW'}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Hearts rating={r.rating} />
                    </td>
                    <td className="px-5 py-4 max-w-xs text-xs text-neutral-600 leading-relaxed italic">
                      <span className="line-clamp-2">
                        {r.body || r.loved_reason || r.disliked_reason || r.return_reason || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold">
                      {r.share_publicly ? (
                        <span className="text-emerald-700">User Approved</span>
                      ) : (
                        <span className="text-neutral-400">Private Only</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedReview(r)}
                          className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                        >
                          View
                        </button>
                        {r.share_publicly ? (
                          <button
                            disabled={busy === r.id}
                            onClick={() => void handleToggle(r)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                              r.admin_approved_public
                                ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                : 'border border-[#7A021D] text-[#7A021D] bg-[#FDF8F4] hover:bg-[#7A021D] hover:text-white'
                            }`}
                          >
                            {r.admin_approved_public ? 'Approved' : 'Approve'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════
          SELECTED REVIEW DETAIL MODAL POPUP
      ══════════════════════════════════════ */}
      {selectedReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedReview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Title & Close */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4 mb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                  Customer Review Details
                </span>
                <h2 className="text-xl font-bold text-[#2C0505] mt-0.5">
                  {selectedReview.products?.name ?? 'Product Review'}
                </h2>
                {selectedReview.products?.brand && (
                  <p className="text-xs text-neutral-500 font-medium">Brand: {selectedReview.products.brand}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Member & Rating Summary Card */}
            <div className="rounded-2xl bg-[#FBF4EF] border border-[#7A021D]/15 p-4 mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#7A021D] font-bold text-sm border border-[#7A021D]/20 shadow-xs">
                  {userInitials(selectedReview.profiles?.full_name)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2C0505]">
                    {selectedReview.profiles?.full_name ?? 'Anonymous Member'}
                  </h4>
                  <span className="text-xs text-neutral-500">
                    {new Date(selectedReview.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Hearts rating={selectedReview.rating} />
                </div>
                <span className="text-xs font-bold text-[#2C0505] mt-0.5 block">
                  {selectedReview.rating}.0 / 5.0 Rating
                </span>
              </div>
            </div>

            {/* Review Type & Sharing Status */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                  Review Origin
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    selectedReview.review_type === 'purchased'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {selectedReview.review_type ? selectedReview.review_type.toUpperCase() : 'REVIEW'}
                </span>
              </div>

              <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                  Storefront Visibility
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    selectedReview.share_publicly
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                  }`}
                >
                  {selectedReview.share_publicly ? 'User Approved' : 'Private Only'}
                </span>
              </div>
            </div>

            {/* Written Review Body */}
            {selectedReview.body && (
              <div className="mb-5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 block mb-2">
                  Customer Comment / Written Review
                </label>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-800 leading-relaxed italic shadow-2xs">
                  &ldquo;{selectedReview.body}&rdquo;
                </div>
              </div>
            )}

            {/* Loved Reason / Highlights */}
            {selectedReview.loved_reason && (
              <div className="mb-5">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-700 block mb-1.5">
                  Loved Highlights
                </label>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 font-medium">
                  ✨ {selectedReview.loved_reason}
                </div>
              </div>
            )}

            {/* Return / Disliked Feedback Breakdown */}
            {(selectedReview.return_reason || selectedReview.disliked_reason) && (
              <div className="mb-5">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-700 block mb-1.5">
                  Return &amp; Fit Feedback Notes
                </label>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-950 font-medium leading-relaxed">
                  🔄 {selectedReview.return_reason || selectedReview.disliked_reason}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
              <span className="text-xs text-neutral-400">
                ID: <code className="text-[11px] font-mono">{selectedReview.id.slice(0, 8)}…</code>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  Close
                </button>

                {selectedReview.share_publicly ? (
                  <button
                    disabled={busy === selectedReview.id}
                    onClick={() => void handleToggle(selectedReview)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                      selectedReview.admin_approved_public
                        ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                        : 'border border-[#7A021D] text-[#7A021D] bg-[#FDF8F4] hover:bg-[#7A021D] hover:text-white'
                    }`}
                  >
                    {selectedReview.admin_approved_public ? '✓ Public Approved' : 'Approve for Storefront'}
                  </button>
                ) : (
                  <span className="text-xs text-neutral-400 italic">User opted out of storefront</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
