'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  listReturns,
  setPickupStatus,
  markReceived,
  qcItem,
  type ReturnBox,
} from '@/lib/returns';

const PICKUP_STEPS: Array<{ key: 'scheduled' | 'in_transit' | 'picked_up'; label: string }> = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'picked_up', label: 'Picked Up' },
];

function qcBadge(status: string | null): string {
  if (status === 'passed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'failed') return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
}

export default function ReturnsPage(): React.ReactElement {
  const { showToast } = useToast();
  const [returns, setReturns] = useState<ReturnBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { returns } = await listReturns();
      setReturns(returns);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePickup(boxId: string, status: 'scheduled' | 'in_transit' | 'picked_up'): Promise<void> {
    setBusy(boxId);
    try {
      await setPickupStatus(boxId, status);
      showToast('success', `Pickup marked ${status.replace('_', ' ')}`);
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleReceive(boxId: string): Promise<void> {
    setBusy(boxId);
    try {
      await markReceived(boxId);
      showToast('success', 'Items marked received');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleQc(itemId: string, result: 'passed' | 'failed'): Promise<void> {
    let notes: string | undefined;
    if (result === 'failed') {
      notes = prompt('QC failure notes (optional):') ?? undefined;
    }
    setBusy(itemId);
    try {
      const res = await qcItem(itemId, result, notes);
      showToast(
        'success',
        result === 'passed'
          ? 'QC passed — SKU restocked'
          : 'QC failed — not restocked',
      );
      if (res.box_status === 'completed') {
        showToast('success', 'All returns processed — box completed');
      }
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
        <h1 className="text-2xl font-semibold text-[#2C0505]">Returns &amp; QC</h1>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-[#FDF8F4] hover:text-[#7A021D] disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-neutral-400">Loading…</div>
      ) : returns.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white py-16 text-center text-neutral-400">
          No returns in the pipeline.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {returns.map((box) => {
            const currentStepIdx = box.pickup_status
              ? PICKUP_STEPS.findIndex((s) => s.key === box.pickup_status)
              : -1;
            return (
              <div key={box.id} className="rounded-lg border border-neutral-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#2C0505]">
                      {box.user?.full_name ?? 'Unknown member'}
                    </div>
                    <div className="font-mono text-xs text-neutral-400">{box.id}</div>
                  </div>
                  {box.received_at && (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                      Received {new Date(box.received_at).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>

                {/* Pickup pipeline */}
                <div className="mb-4 flex items-center gap-2">
                  {PICKUP_STEPS.map((step, idx) => {
                    const reached = currentStepIdx >= idx;
                    const isNext = currentStepIdx === idx - 1;
                    return (
                      <div key={step.key} className="flex items-center gap-2">
                        <button
                          disabled={busy === box.id || reached || (!isNext && currentStepIdx !== idx)}
                          onClick={() => void handlePickup(box.id, step.key)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            reached
                              ? 'bg-[#7A021D] text-white'
                              : isNext
                                ? 'border border-[#7A021D] text-[#7A021D] hover:bg-[#FDF8F4]'
                                : 'border border-neutral-200 text-neutral-400'
                          } disabled:cursor-not-allowed`}
                        >
                          {step.label}
                        </button>
                        {idx < PICKUP_STEPS.length - 1 && <span className="text-neutral-300">→</span>}
                      </div>
                    );
                  })}
                  {box.pickup_status === 'picked_up' && !box.received_at && (
                    <button
                      disabled={busy === box.id}
                      onClick={() => void handleReceive(box.id)}
                      className="ml-2 rounded-full border border-sky-600 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50"
                    >
                      Mark Received
                    </button>
                  )}
                </div>

                {/* Returned items + QC */}
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs font-medium uppercase text-neutral-500">
                    <tr>
                      <th className="py-2">Item</th>
                      <th className="py-2">Size</th>
                      <th className="py-2">Reason</th>
                      <th className="py-2">QC</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {box.returned_items.map((item) => {
                      const decided = item.qc_status === 'passed' || item.qc_status === 'failed';
                      const canQc = !!box.received_at && !decided;
                      return (
                        <tr key={item.id}>
                          <td className="py-2 font-medium text-[#2C0505]">{item.product_name}</td>
                          <td className="py-2 text-neutral-600">{item.variant_size}</td>
                          <td className="py-2 text-neutral-600">{item.return_reason ?? '—'}</td>
                          <td className="py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${qcBadge(item.qc_status)}`}>
                              {item.qc_status ?? 'pending'}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            {canQc ? (
                              <div className="inline-flex gap-2">
                                <button
                                  disabled={busy === item.id}
                                  onClick={() => void handleQc(item.id, 'passed')}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Pass
                                </button>
                                <button
                                  disabled={busy === item.id}
                                  onClick={() => void handleQc(item.id, 'failed')}
                                  className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                  Fail
                                </button>
                              </div>
                            ) : decided ? (
                              <span className="text-xs text-neutral-400">Inspected</span>
                            ) : (
                              <span className="text-xs text-neutral-400">Awaiting receipt</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
