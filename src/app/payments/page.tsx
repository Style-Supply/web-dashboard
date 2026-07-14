'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { request } from '@/lib/api';

interface Payment {
  id: string;
  user_id: string;
  payment_type: 'membership' | 'purchase';
  amount_minor: number;
  gst_minor: number;
  credit_applied_minor: number;
  payable_minor: number;
  status: string;
  method: string;
  created_at: string;
  user_confirmed_at: string | null;
  admin_confirmed_at: string | null;
  profiles: { full_name: string } | null;
  boxes: { id: string; status: string } | null;
  memberships: { id: string; plan: string; status: string } | null;
}

const STATUSES = ['all', 'pending_user_confirmation', 'pending_admin_verification', 'confirmed', 'failed', 'cancelled'] as const;

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending_user_confirmation: 'bg-orange-100 text-orange-700',
    pending_admin_verification: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-neutral-100 text-neutral-500',
  };
  return map[status] ?? 'bg-neutral-100 text-neutral-600';
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_user_confirmation: 'User Pending',
    pending_admin_verification: 'Verify Transfer',
    confirmed: 'Confirmed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };
  return labels[status] ?? status;
}

export default function PaymentsPage() {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending_admin_verification');
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, limit: String(PAGE_SIZE), offset: String(offset) });
      const data = await request<{ payments: Payment[]; total: number }>(`/api/admin/payments?${params}`);
      setPayments(data.payments);
      setTotal(data.total);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, offset]);

  useEffect(() => { void load(); }, [load]);

  async function handleConfirm(id: string) {
    if (!confirm('Confirm this payment? This will activate the linked membership/box.')) return;
    setBusy(id);
    try {
      await request(`/api/admin/payments/${id}/confirm`, { method: 'POST' });
      showToast('success', 'Payment confirmed ✓');
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleFail(id: string) {
    const reason = prompt('Reason for failure (optional):');
    setBusy(id);
    try {
      await request(`/api/admin/payments/${id}/fail`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      showToast('success', 'Payment marked as failed');
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2C0505]">Payments</h1>
          <p className="mt-1 text-sm text-neutral-500">Verify manual QR transfers and advance membership / box state</p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-[#FDF8F4] hover:text-[#7A021D] disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setOffset(0); setStatusFilter(s); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-[#7A021D] text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {s === 'all' ? 'All' : statusLabel(s)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-100 text-sm">
          <thead className="bg-[#FDF8F4]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Type</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Payable</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-400">Loading…</td>
              </tr>
            )}
            {!loading && payments.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-400">
                  No payments found for this filter.
                </td>
              </tr>
            )}
            {!loading && payments.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#2C0505]">{p.profiles?.full_name ?? '—'}</div>
                  <div className="text-xs text-neutral-400">{p.id.slice(0, 8)}…</div>
                </td>
                <td className="px-4 py-3 capitalize text-neutral-700">{p.payment_type}</td>
                <td className="px-4 py-3 text-right font-medium text-neutral-700">{formatAmount(p.amount_minor)}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#2C0505]">{formatAmount(p.payable_minor)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(p.status)}`}>
                    {statusLabel(p.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-right">
                  {p.status === 'pending_admin_verification' && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => void handleConfirm(p.id)}
                        disabled={busy === p.id}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {busy === p.id ? '…' : '✓ Confirm'}
                      </button>
                      <button
                        onClick={() => void handleFail(p.id)}
                        disabled={busy === p.id}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        ✕ Fail
                      </button>
                    </div>
                  )}
                  {p.status !== 'pending_admin_verification' && (
                    <span className="text-xs text-neutral-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
        <div>{total} payment{total === 1 ? '' : 's'}</div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-[#FDF8F4] disabled:opacity-40"
          >Prev</button>
          <span>Page {page} of {pageCount}</span>
          <button
            disabled={page >= pageCount}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-[#FDF8F4] disabled:opacity-40"
          >Next</button>
        </div>
      </div>
    </div>
  );
}
