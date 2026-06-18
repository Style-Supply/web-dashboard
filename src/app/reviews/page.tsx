'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { listReviews, setReviewPublic, type Review } from '@/lib/reviews';

function Hearts({ rating }: { rating: number }): React.ReactElement {
  return (
    <span className="text-[#7A021D]" aria-label={`${rating} of 5`}>
      {'♥'.repeat(rating)}
      <span className="text-neutral-300">{'♥'.repeat(5 - rating)}</span>
    </span>
  );
}

export default function ReviewsPage(): React.ReactElement {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'' | 'returned' | 'purchased'>('');
  const [ratingFilter, setRatingFilter] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { reviews } = await listReviews({
        review_type: typeFilter || undefined,
        rating: ratingFilter ? Number(ratingFilter) : undefined,
      });
      setReviews(reviews);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, ratingFilter, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggle(review: Review): Promise<void> {
    setBusy(review.id);
    try {
      await setReviewPublic(review.id, !review.admin_approved_public);
      showToast('success', review.admin_approved_public ? 'Removed from public' : 'Approved for public');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2C0505]">Reviews</h1>
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as '' | 'returned' | 'purchased')}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
          >
            <option value="">All Types</option>
            <option value="purchased">Purchased</option>
            <option value="returned">Returned</option>
          </select>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
          >
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} hearts</option>
            ))}
          </select>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-[#FDF8F4] hover:text-[#7A021D] disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Shared?</th>
              <th className="px-4 py-3 text-right">Public</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-400">Loading…</td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-400">No reviews found</td></tr>
            ) : reviews.map((r) => (
              <tr key={r.id} className="hover:bg-neutral-50 align-top">
                <td className="px-4 py-3 font-medium text-[#2C0505]">{r.products?.name ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-600">{r.profiles?.full_name ?? '—'}</td>
                <td className="px-4 py-3 capitalize">{r.review_type ?? '—'}</td>
                <td className="px-4 py-3"><Hearts rating={r.rating} /></td>
                <td className="px-4 py-3 max-w-xs text-neutral-600">
                  {r.body || r.loved_reason || r.disliked_reason || r.return_reason || '—'}
                </td>
                <td className="px-4 py-3">
                  {r.share_publicly ? (
                    <span className="text-emerald-600">Yes</span>
                  ) : (
                    <span className="text-neutral-400">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.share_publicly ? (
                    <button
                      disabled={busy === r.id}
                      onClick={() => void handleToggle(r)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                        r.admin_approved_public
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'border border-[#7A021D] text-[#7A021D] hover:bg-[#FDF8F4]'
                      }`}
                    >
                      {r.admin_approved_public ? 'Approved' : 'Approve'}
                    </button>
                  ) : (
                    <span className="text-xs text-neutral-400">Not shared</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
