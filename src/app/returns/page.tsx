'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  listReturns,
  setPickupStatus,
  markReceived,
  qcItem,
  type ReturnBox,
} from '@/lib/returns';

const PICKUP_STEPS: Array<{ key: 'scheduled' | 'in_transit' | 'picked_up'; label: string; icon: string }> = [
  { key: 'scheduled', label: '1. Courier Scheduled', icon: '📅' },
  { key: 'in_transit', label: '2. Courier In Transit', icon: '🚚' },
  { key: 'picked_up', label: '3. Picked Up', icon: '📦' },
];

function qcBadge(status: string | null): string {
  if (status === 'passed') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'failed') return 'bg-red-50 text-red-800 border-red-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

function userInitials(name?: string | null): string {
  if (!name) return 'R';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'R';
}

export default function ReturnsPage(): React.ReactElement {
  const { showToast } = useToast();
  const [returns, setReturns] = useState<ReturnBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'needs_pickup' | 'needs_qc'>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { returns } = await listReturns();
      setReturns(returns);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load returns pipeline');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredReturns = useMemo(() => {
    return returns.filter((box) => {
      const matchesSearch =
        !search.trim() ||
        box.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        box.id.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === 'needs_pickup') {
        return box.pickup_status !== 'picked_up';
      }
      if (filterTab === 'needs_qc') {
        return Boolean(box.received_at) && box.returned_items.some((i) => !i.qc_status);
      }
      return true;
    });
  }, [returns, search, filterTab]);

  // KPI Metrics
  const totalInPipeline = returns.length;
  const awaitingPickupCount = useMemo(
    () => returns.filter((r) => r.pickup_status !== 'picked_up').length,
    [returns],
  );
  const awaitingQcCount = useMemo(
    () => returns.filter((r) => r.received_at && r.returned_items.some((i) => !i.qc_status)).length,
    [returns],
  );
  const totalReturnedItems = useMemo(
    () => returns.reduce((acc, r) => acc + (r.returned_items?.length || 0), 0),
    [returns],
  );

  async function handlePickup(boxId: string, status: 'scheduled' | 'in_transit' | 'picked_up'): Promise<void> {
    setBusy(boxId);
    try {
      await setPickupStatus(boxId, status);
      showToast('success', `Pickup status updated to ${status.replace('_', ' ')}`);
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update pickup');
    } finally {
      setBusy(null);
    }
  }

  async function handleReceive(boxId: string): Promise<void> {
    setBusy(boxId);
    try {
      await markReceived(boxId);
      showToast('success', 'Returned items marked as received at warehouse');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to mark received');
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
          ? 'QC Passed — Inventory SKU restocked +1'
          : 'QC Failed — Item marked non-restockable',
      );
      if (res.box_status === 'completed') {
        showToast('success', '🎉 All return items inspected — Box completed!');
      }
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'QC inspection failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-full bg-neutral-50 p-6">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C0505]">Returns &amp; Quality Control (QC)</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            Track return pickups, receive shipments, and inspect returned garments for inventory restocking
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
            {loading ? 'Loading…' : 'Refresh Pipeline'}
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Pipeline Boxes</p>
          <p className="mt-2 text-2xl font-extrabold text-[#2C0505]">{totalInPipeline}</p>
          <p className="mt-1 text-xs text-neutral-500">Boxes currently in return flow</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Awaiting Courier Pickup</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-900">{awaitingPickupCount}</p>
          <p className="mt-1 text-xs text-amber-600">Pending logistics pickup</p>
        </div>
        <div className="rounded-2xl border border-[#7A021D]/20 bg-[#FDF8F4] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7A021D]">Pending Warehouse QC</p>
          <p className="mt-2 text-2xl font-extrabold text-[#7A021D]">{awaitingQcCount}</p>
          <p className="mt-1 text-xs text-neutral-500">Received & ready for inspection</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Total Return Garments</p>
          <p className="mt-2 text-2xl font-extrabold text-sky-900">{totalReturnedItems}</p>
          <p className="mt-1 text-xs text-sky-600">Items queued for QC inspection</p>
        </div>
      </div>

      {/* ── Toolbar: Tabs & Search ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-xs">
          <button
            onClick={() => setFilterTab('all')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filterTab === 'all'
                ? 'bg-[#7A021D] text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            All Returns ({returns.length})
          </button>
          <button
            onClick={() => setFilterTab('needs_pickup')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filterTab === 'needs_pickup'
                ? 'bg-[#7A021D] text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            Needs Pickup ({awaitingPickupCount})
          </button>
          <button
            onClick={() => setFilterTab('needs_qc')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filterTab === 'needs_qc'
                ? 'bg-[#7A021D] text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            Needs QC Inspection ({awaitingQcCount})
          </button>
        </div>

        <div className="relative max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member or box ID…"
            className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D]"
          />
        </div>
      </div>

      {/* ── Content Body ── */}
      {loading ? (
        <div className="py-16 text-center text-[#2C0505]">Loading return boxes…</div>
      ) : filteredReturns.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white py-16 text-center text-neutral-400 shadow-xs">
          No return boxes match your current filter.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredReturns.map((box) => {
            const currentStepIdx = box.pickup_status
              ? PICKUP_STEPS.findIndex((s) => s.key === box.pickup_status)
              : -1;

            return (
              <div
                key={box.id}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs hover:shadow-md transition-all"
              >
                {/* Box Card Header */}
                <div className="border-b border-neutral-100 bg-[#FDF8F4] px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7A021D] text-white font-bold text-xs shadow-xs">
                      {userInitials(box.user?.full_name)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#2C0505]">
                        {box.user?.full_name ?? 'Unknown Member'}
                      </h3>
                      <p className="font-mono text-xs text-neutral-400">Box ID: {box.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {box.received_at ? (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 shadow-2xs">
                        🏢 Received at Warehouse ({new Date(box.received_at).toLocaleDateString('en-IN')})
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                        ⏳ Awaiting Warehouse Delivery
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {/* Step 1: Pickup Progress Stepper */}
                  <div className="mb-6 rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                      Logistics &amp; Pickup Tracking
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      {PICKUP_STEPS.map((step, idx) => {
                        const reached = currentStepIdx >= idx;
                        const isNext = currentStepIdx === idx - 1;
                        return (
                          <div key={step.key} className="flex items-center gap-3">
                            <button
                              disabled={busy === box.id || reached || (!isNext && currentStepIdx !== idx)}
                              onClick={() => void handlePickup(box.id, step.key)}
                              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-2xs ${
                                reached
                                  ? 'bg-[#7A021D] text-white'
                                  : isNext
                                    ? 'border-2 border-[#7A021D] text-[#7A021D] bg-white hover:bg-[#FDF8F4]'
                                    : 'border border-neutral-200 text-neutral-400 bg-white'
                              } disabled:cursor-not-allowed`}
                            >
                              <span>{step.icon}</span>
                              <span>{step.label}</span>
                            </button>
                            {idx < PICKUP_STEPS.length - 1 && <span className="text-neutral-300 font-bold">→</span>}
                          </div>
                        );
                      })}

                      {box.pickup_status === 'picked_up' && !box.received_at && (
                        <button
                          disabled={busy === box.id}
                          onClick={() => void handleReceive(box.id)}
                          className="ml-auto flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-sky-700 disabled:opacity-50 transition-all"
                        >
                          🏢 Mark Received at Warehouse
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Returned Garments QC Inspection Table */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                      Returned Garments for Quality Inspection
                    </p>

                    <div className="overflow-hidden rounded-xl border border-neutral-200">
                      <table className="w-full text-sm">
                        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          <tr>
                            <th className="px-4 py-3">Returned Product</th>
                            <th className="px-4 py-3">Size Variant</th>
                            <th className="px-4 py-3">Return Reason</th>
                            <th className="px-4 py-3">QC Status</th>
                            <th className="px-4 py-3 text-right">Inspection Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {box.returned_items.map((item) => {
                            const decided = item.qc_status === 'passed' || item.qc_status === 'failed';
                            const canQc = Boolean(box.received_at) && !decided;

                            return (
                              <tr key={item.id} className="hover:bg-neutral-50/70 transition-colors">
                                <td className="px-4 py-3.5 font-bold text-[#2C0505]">
                                  {item.product_name}
                                </td>
                                <td className="px-4 py-3.5 font-medium text-neutral-600">
                                  {item.variant_size}
                                </td>
                                <td className="px-4 py-3.5 text-xs text-neutral-600 italic">
                                  {item.return_reason ? `&ldquo;${item.return_reason}&rdquo;` : '—'}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${qcBadge(item.qc_status)}`}>
                                    {item.qc_status ?? 'Pending QC'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                  {canQc ? (
                                    <div className="inline-flex gap-2">
                                      <button
                                        disabled={busy === item.id}
                                        onClick={() => void handleQc(item.id, 'passed')}
                                        className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-2xs"
                                      >
                                        ✓ QC Pass &amp; Restock (+1)
                                      </button>
                                      <button
                                        disabled={busy === item.id}
                                        onClick={() => void handleQc(item.id, 'failed')}
                                        className="rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-2xs"
                                      >
                                        ✕ QC Fail (Damage)
                                      </button>
                                    </div>
                                  ) : decided ? (
                                    <span className="text-xs font-medium text-neutral-400">
                                      Inspected ({item.qc_status?.toUpperCase()})
                                    </span>
                                  ) : (
                                    <span className="text-xs text-neutral-400 italic">
                                      Awaiting warehouse receipt
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
