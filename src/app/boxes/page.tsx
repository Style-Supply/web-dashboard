'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { listBoxes, shipBox, deliverBox } from '@/lib/boxes';
import type { Box } from '@/types/box';

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<string, string> = {
  building: 'Building',
  confirmed: 'Confirmed',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  session_active: 'Session Active',
  session_ended: 'Session Ended',
};

export default function BoxesPage(): React.ReactElement {
  const { showToast } = useToast();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listBoxes({ status: statusFilter || undefined, limit: PAGE_SIZE, offset });
      setBoxes(result.boxes);
      setTotal(result.total);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  async function handleShip(id: string): Promise<void> {
    const tracking = prompt('Enter tracking number:');
    if (!tracking) return;
    try {
      await shipBox(id, tracking);
      showToast('success', 'Box marked as shipped');
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleDeliver(id: string): Promise<void> {
    if (!confirm('Mark this box as delivered?')) return;
    try {
      await deliverBox(id);
      showToast('success', 'Box marked as delivered');
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed');
    }
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2C0505]">Boxes</h1>
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
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Tracking</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Loading...</td></tr>
            ) : boxes.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No boxes found</td></tr>
            ) : boxes.map((box) => (
              <tr key={box.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">{box.profiles?.full_name ?? 'Unknown'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium">
                    {STATUS_LABELS[box.status] ?? box.status}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(box.created_at).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3 font-mono text-xs">{box.tracking_number ?? '—'}</td>
                <td className="px-4 py-3 space-x-2">
                  {box.status === 'paid' && (
                    <button onClick={() => void handleShip(box.id)} className="text-xs font-medium text-[#7A021D] hover:underline">Ship</button>
                  )}
                  {box.status === 'shipped' && (
                    <button onClick={() => void handleDeliver(box.id)} className="text-xs font-medium text-[#7A021D] hover:underline">Deliver</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
        <div>{total} box{total === 1 ? '' : 'es'}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))} className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-[#FDF8F4] disabled:opacity-40">Prev</button>
          <span>Page {page} of {pageCount}</span>
          <button disabled={page >= pageCount} onClick={() => setOffset(o => o + PAGE_SIZE)} className="rounded-lg border border-neutral-200 px-3 py-1 text-sm hover:bg-[#FDF8F4] disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
