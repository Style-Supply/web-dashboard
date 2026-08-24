'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  listPayments,
  autoVerifyPayment,
  autoVerifyAllPayments,
  confirmPayment,
  failPayment,
  type Payment,
  type PaymentStatus,
} from '@/lib/payments';

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_user_confirmation: 'Awaiting User',
  pending_admin_verification: 'Auto-Verifying',
  confirmed: 'Confirmed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_BADGE: Record<PaymentStatus, string> = {
  pending_user_confirmation: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  pending_admin_verification: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-neutral-100 text-neutral-500 border-neutral-200',
};

function rupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function userInitials(name?: string | null): string {
  if (!name) return 'P';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'P';
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

export default function PaymentsPage(): React.ReactElement {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listPayments({
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setPayments(result.payments);
      setTotal(result.total);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, offset, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPayments = useMemo(() => {
    if (!search.trim()) return payments;
    const query = search.toLowerCase();
    return payments.filter(
      (p) =>
        p.user?.full_name?.toLowerCase().includes(query) ||
        p.payment_type?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query),
    );
  }, [payments, search]);

  // KPI Metrics
  const needsVerificationCount = useMemo(
    () => payments.filter((p) => p.status === 'pending_admin_verification').length,
    [payments],
  );

  const confirmedRevenueMinor = useMemo(
    () => payments.filter((p) => p.status === 'confirmed').reduce((acc, p) => acc + p.payable_minor, 0),
    [payments],
  );

  const totalCreditAppliedMinor = useMemo(
    () => payments.reduce((acc, p) => acc + (p.credit_applied_minor || 0), 0),
    [payments],
  );

  async function handleAutoVerify(id: string): Promise<void> {
    setBusy(id);
    try {
      const res = await autoVerifyPayment(id);
      if (res.verified) {
        showToast('success', 'Payment verified and confirmed via Razorpay!');
      } else {
        showToast('success', res.message || 'Payment checked from Razorpay');
      }
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleSyncRazorpay(): Promise<void> {
    setSyncing(true);
    try {
      const res = await autoVerifyAllPayments();
      showToast('success', `Razorpay sync complete. ${res.totalConfirmed} payments auto-confirmed.`);
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const STATUS_TABS: { id: PaymentStatus | ''; label: string }[] = [
    { id: '', label: 'All Statuses' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'pending_admin_verification', label: 'Needs Verification' },
    { id: 'pending_user_confirmation', label: 'Awaiting User' },
    { id: 'failed', label: 'Failed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="min-h-full bg-neutral-50 p-6">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C0505]">Payments & Transactions</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            Verify member transaction receipts, process payments, and track revenue
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 shadow-xs cursor-pointer"
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
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Payments</p>
          <p className="mt-2 text-2xl font-extrabold text-[#2C0505]">{total}</p>
          <p className="mt-1 text-xs text-neutral-500">Transaction log entries</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Needs Verification</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-900">{needsVerificationCount}</p>
          <p className="mt-1 text-xs text-amber-600">Pending admin review</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Confirmed Revenue</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">
            {rupees(confirmedRevenueMinor)}
          </p>
          <p className="mt-1 text-xs text-emerald-600">Total verified payments</p>
        </div>
        <div className="rounded-2xl border border-[#7A021D]/20 bg-[#FDF8F4] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7A021D]">Credits Applied</p>
          <p className="mt-2 text-2xl font-extrabold text-[#7A021D]">
            {rupees(totalCreditAppliedMinor)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Discounts redeemed</p>
        </div>
      </div>

      {/* ── Toolbar: Status Tabs & Search ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-xs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setOffset(0);
                setStatusFilter(tab.id);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? 'bg-[#7A021D] text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & View Switcher */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member or payment ID…"
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
      {!loading && filteredPayments.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPayments.map((p) => (
            <div
              key={p.id}
              className={`group relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:shadow-md transition-all ${
                busy === p.id ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div>
                {/* User Avatar & Payment Type */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FDF8F4] text-[#7A021D] font-bold text-sm border border-[#7A021D]/20 shadow-xs">
                      {userInitials(p.user?.full_name)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#2C0505]">
                        {p.user?.full_name ?? 'Unknown User'}
                      </h3>
                      <p className="text-xs text-neutral-400 capitalize">{p.payment_type} Payment</p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      STATUS_BADGE[p.status]
                    }`}
                  >
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>

                {/* Payable Amount & Credit Summary Card */}
                <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Payable Amount</p>
                    <p className="text-xl font-extrabold text-[#7A021D]">
                      {rupees(p.payable_minor)}
                    </p>
                  </div>

                  <div className="text-right text-xs space-y-0.5 text-neutral-500">
                    <p>Total: {rupees(p.amount_minor + p.gst_minor)}</p>
                    {p.credit_applied_minor > 0 && (
                      <p className="font-semibold text-emerald-700">−{rupees(p.credit_applied_minor)} Credit</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                  <span>📅 Requested: {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Status Footer */}
              <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-end text-xs">
                {p.status === 'confirmed' ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verified & Confirmed
                  </span>
                ) : p.status === 'pending_user_confirmation' ? (
                  <span className="text-xs text-neutral-400">Awaiting user checkout</span>
                ) : p.status === 'failed' ? (
                  <span className="text-xs text-red-600 font-semibold">Payment Failed</span>
                ) : (
                  <span className="text-xs text-neutral-400">—</span>
                )}
              </div>
            </div>
          ))}
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
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Amount + GST</th>
                <th className="px-5 py-3.5">Credit Applied</th>
                <th className="px-5 py-3.5">Payable</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Requested Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-neutral-400">Loading payments…</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-neutral-400">No payments found</td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-5 py-4 font-bold text-[#2C0505]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FDF8F4] text-[#7A021D] font-bold text-xs border border-[#7A021D]/20">
                          {userInitials(p.user?.full_name)}
                        </div>
                        <div>
                          <p className="font-bold text-[#2C0505]">{p.user?.full_name ?? 'Unknown'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 capitalize font-medium text-neutral-700">{p.payment_type}</td>
                    <td className="px-5 py-4 text-neutral-600">{rupees(p.amount_minor + p.gst_minor)}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-emerald-700">
                      {p.credit_applied_minor > 0 ? `−${rupees(p.credit_applied_minor)}` : '—'}
                    </td>
                    <td className="px-5 py-4 font-extrabold text-[#7A021D]">{rupees(p.payable_minor)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-neutral-500 text-right">
                      {new Date(p.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      <div className="mt-5 flex items-center justify-between text-sm text-neutral-600">
        <div>{loading ? 'Loading…' : `${total} payment${total === 1 ? '' : 's'}`}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            className="rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold hover:bg-[#FDF8F4] disabled:opacity-40 shadow-xs"
          >
            Prev
          </button>
          <span className="text-xs font-medium">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            className="rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold hover:bg-[#FDF8F4] disabled:opacity-40 shadow-xs"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
