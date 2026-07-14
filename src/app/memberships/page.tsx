'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { listMemberships, updateMembership } from '@/lib/memberships';
import { request } from '@/lib/api';
import type { Membership, MembershipStatus } from '@/types/membership';

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<MembershipStatus, string> = {
  active: 'Active',
  payment_pending: 'Pending Payment',
  paused: 'Paused',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const STATUS_COLORS: Record<MembershipStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  payment_pending: 'bg-blue-100 text-blue-700',
  paused: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-neutral-200 text-neutral-700',
  expired: 'bg-red-100 text-red-700',
};

function formatRupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function MembershipsPage(): React.ReactElement {
  const { showToast } = useToast();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listMemberships({ status: statusFilter || undefined, limit: PAGE_SIZE, offset });
      setMemberships(result.memberships);
      setTotal(result.total);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter, showToast]);

  useEffect(() => { void load(); }, [load]);

  async function handleStatusChange(id: string, status: MembershipStatus): Promise<void> {
    setRowBusy(id);
    try {
      await updateMembership(id, { status });
      showToast('success', `Membership set to ${STATUS_LABELS[status]}`);
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setRowBusy(null);
    }
  }

  async function handleAdjustCredit(m: Membership): Promise<void> {
    const current = (m.credit_balance_minor / 100).toString();
    const input = prompt(`Adjust credit balance (₹) for ${m.profiles?.full_name ?? 'user'}:`, current);
    if (input === null) return;
    const rupees = Number(input);
    if (!Number.isFinite(rupees) || rupees < 0) {
      showToast('error', 'Enter a valid non-negative number');
      return;
    }
    setRowBusy(m.id);
    try {
      await updateMembership(m.id, { credit_balance_minor: Math.round(rupees * 100) });
      showToast('success', 'Credit balance updated');
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setRowBusy(null);
    }
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2C0505]">Memberships</h1>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setOffset(0); setStatusFilter(e.target.value); }}
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
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-[#FDF8F4] hover:text-[#7A021D] disabled:opacity-50"
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
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Credit</th>
              <th className="px-4 py-3">Activated</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-400">Loading...</td></tr>
            ) : memberships.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-400">No memberships found</td></tr>
            ) : memberships.map((m) => (
              <tr key={m.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">{m.profiles?.full_name ?? 'Unknown'}</td>
                <td className="px-4 py-3 capitalize">{m.plan}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.status]}`}>
                    {STATUS_LABELS[m.status]}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{formatRupees(m.credit_balance_minor)}</td>
                <td className="px-4 py-3">{m.activated_at ? new Date(m.activated_at).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-4 py-3">{m.expires_at ? new Date(m.expires_at).toLocaleDateString('en-IN') : '—'}</td>
                <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => void handleAdjustCredit(m)}
                    disabled={rowBusy === m.id}
                    className="text-xs font-medium text-[#7A021D] hover:underline disabled:opacity-40"
                  >
                    Edit Credit
                  </button>
                  {m.status === 'active' && (
                    <button onClick={() => void handleStatusChange(m.id, 'paused')} disabled={rowBusy === m.id} className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-40">Pause</button>
                  )}
                  {m.status === 'paused' && (
                    <button
                      disabled={rowBusy === m.id}
                      onClick={async () => {
                        setRowBusy(m.id);
                        try {
                          await request(`/api/admin/memberships/${m.id}/reactivate`, { method: 'POST' });
                          await load();
                        } catch { /* ignore */ } finally { setRowBusy(null); }
                      }}
                      className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-40"
                      title={m.paused_until ? `Paused until ${new Date(m.paused_until).toLocaleDateString('en-IN')}` : ''}
                    >
                      Reactivate
                    </button>
                  )}
                  {(m.status === 'active' || m.status === 'paused') && (
                    <button onClick={() => void handleStatusChange(m.id, 'cancelled')} disabled={rowBusy === m.id} className="text-xs font-medium text-red-700 hover:underline disabled:opacity-40">Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
        <div>{total} membership{total === 1 ? '' : 's'}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))} className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-[#FDF8F4] disabled:opacity-40">Prev</button>
          <span>Page {page} of {pageCount}</span>
          <button disabled={page >= pageCount} onClick={() => setOffset(o => o + PAGE_SIZE)} className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-[#FDF8F4] disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
