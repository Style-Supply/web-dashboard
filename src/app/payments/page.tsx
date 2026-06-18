'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  listPayments,
  confirmPayment,
  failPayment,
  type Payment,
  type PaymentStatus,
} from '@/lib/payments';

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_user_confirmation: 'Awaiting User',
  pending_admin_verification: 'Needs Verification',
  confirmed: 'Confirmed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_BADGE: Record<PaymentStatus, string> = {
  pending_user_confirmation: 'bg-neutral-100 text-neutral-600',
  pending_admin_verification: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
};

function rupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export default function PaymentsPage(): React.ReactElement {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('pending_admin_verification');
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

  async function handleConfirm(id: string): Promise<void> {
    if (!confirm('Confirm this payment? This advances membership/purchase state.')) return;
    setBusy(id);
    try {
      await confirmPayment(id);
      showToast('success', 'Payment confirmed');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleFail(id: string): Promise<void> {
    const notes = prompt('Reason for failing this payment (optional):') ?? undefined;
    setBusy(id);
    try {
      await failPayment(id, notes);
      showToast('success', 'Payment marked failed');
      await load();
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2C0505]">Payments</h1>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setOffset(0);
              setStatusFilter(e.target.value as PaymentStatus | '');
            }}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
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
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Credit</th>
              <th className="px-4 py-3">Payable</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-400">Loading…</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-400">No payments found</td></tr>
            ) : payments.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-[#2C0505]">{p.user?.full_name ?? 'Unknown'}</td>
                <td className="px-4 py-3 capitalize">{p.payment_type}</td>
                <td className="px-4 py-3">{rupees(p.amount_minor + p.gst_minor)}</td>
                <td className="px-4 py-3 text-neutral-500">{p.credit_applied_minor > 0 ? `−${rupees(p.credit_applied_minor)}` : '—'}</td>
                <td className="px-4 py-3 font-semibold">{rupees(p.payable_minor)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3 text-right">
                  {p.status === 'pending_admin_verification' ? (
                    <div className="inline-flex gap-2">
                      <button
                        disabled={busy === p.id}
                        onClick={() => void handleConfirm(p.id)}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        disabled={busy === p.id}
                        onClick={() => void handleFail(p.id)}
                        className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Fail
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
        <div>{total} payment{total === 1 ? '' : 's'}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))} className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-[#FDF8F4] disabled:opacity-40">Prev</button>
          <span>Page {page} of {pageCount}</span>
          <button disabled={page >= pageCount} onClick={() => setOffset(o => o + PAGE_SIZE)} className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-[#FDF8F4] disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
