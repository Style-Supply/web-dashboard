'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import {
  listReturns,
  setPickupStatus,
  markReceived,
  qcItem,
  type ReturnBox,
  type ReturnedItem,
} from '@/lib/returns';

const PICKUP_STEPS: Array<{ key: 'scheduled' | 'in_transit' | 'picked_up' | 'received_at_warehouse'; label: string; icon: string }> = [
  { key: 'scheduled', label: '1. Courier Scheduled', icon: '📅' },
  { key: 'in_transit', label: '2. Courier In Transit', icon: '🚚' },
  { key: 'picked_up', label: '3. Picked Up', icon: '📦' },
  { key: 'received_at_warehouse', label: '4. Received at Warehouse', icon: '🏢' },
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

function formatReturnReason(reason: string | null): React.ReactNode {
  if (!reason) return <span className="text-neutral-400">—</span>;
  if (reason === '__rent__' || reason.includes('__rent__')) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-black uppercase tracking-wider shadow-2xs"
        style={{ backgroundColor: '#D8C3BB' }}
      >
        Rent Return
      </span>
    );
  }
  return <span className="text-xs text-neutral-600 italic">“{reason}”</span>;
}

export default function ReturnsPage(): React.ReactElement {
  const { showToast } = useToast();
  const [returns, setReturns] = useState<ReturnBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'needs_pickup' | 'needs_qc'>('all');
  const [busy, setBusy] = useState<string | null>(null);

  // Edit / Inspection Modal State
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});

  const editingBox = useMemo(() => {
    if (!editingBoxId) return null;
    return returns.find((b) => b.id === editingBoxId) ?? null;
  }, [editingBoxId, returns]);

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
        return box.pickup_status !== 'picked_up' && box.pickup_status !== 'received_at_warehouse';
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
    () => returns.filter((r) => r.pickup_status !== 'picked_up' && r.pickup_status !== 'received_at_warehouse').length,
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

  async function handlePickup(boxId: string, status: 'scheduled' | 'in_transit' | 'picked_up' | 'received_at_warehouse'): Promise<void> {
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

  async function handleQc(itemId: string, result: 'passed' | 'failed', customNotes?: string): Promise<void> {
    let notes: string | undefined = customNotes ?? itemNotes[itemId];
    if (result === 'failed' && notes === undefined) {
      notes = prompt('QC failure notes (optional):') ?? undefined;
    }
    setBusy(itemId);
    try {
      const res = await qcItem(itemId, result, notes);
      setReturns((prev) =>
        prev.map((box) => ({
          ...box,
          returned_items: box.returned_items.map((it) =>
            it.id === itemId ? { ...it, qc_status: result } : it
          ),
        }))
      );
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
            Track return pickups, receive shipments, inspect returned garments, and edit lifecycle statuses
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
          <p className="mt-1 text-xs text-neutral-500">Received &amp; ready for inspection</p>
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
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-[#7A021D] text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            All Returns ({returns.length})
          </button>
          <button
            onClick={() => setFilterTab('needs_pickup')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'needs_pickup'
                ? 'bg-[#7A021D] text-white shadow-xs'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            Needs Pickup ({awaitingPickupCount})
          </button>
          <button
            onClick={() => setFilterTab('needs_qc')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
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

                    <button
                      type="button"
                      onClick={() => setEditingBoxId(box.id)}
                      className="flex items-center gap-1.5 rounded-xl border border-[#7A021D] bg-white px-3 py-1.5 text-xs font-bold text-[#7A021D] hover:bg-[#7A021D] hover:text-white transition-all shadow-2xs cursor-pointer"
                    >
                      <span>✏️</span>
                      <span>Edit &amp; Inspect</span>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Step 1: Pickup Progress Stepper */}
                  <div className="mb-6 rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Logistics &amp; Pickup Tracking
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditingBoxId(box.id)}
                        className="text-xs font-semibold text-[#7A021D] hover:underline cursor-pointer"
                      >
                        Override Status ⚙️
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {PICKUP_STEPS.map((step, idx) => {
                        const reached = currentStepIdx >= idx;
                        const isNext = currentStepIdx === idx - 1;
                        return (
                          <div key={step.key} className="flex items-center gap-3">
                            <button
                              disabled={busy === box.id}
                              onClick={() => void handlePickup(box.id, step.key)}
                              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                                reached
                                  ? 'bg-[#7A021D] text-white'
                                  : isNext
                                    ? 'border-2 border-[#7A021D] text-[#7A021D] bg-white hover:bg-[#FDF8F4]'
                                    : 'border border-neutral-200 text-neutral-600 bg-white hover:border-[#7A021D]'
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
                          className="ml-auto flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-sky-700 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          🏢 Mark Received at Warehouse
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Returned Garments QC Inspection Table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Returned Garments for Quality Inspection
                      </p>
                      <span className="text-xs text-neutral-500 font-medium">
                        {box.returned_items.filter((i) => i.qc_status).length} of {box.returned_items.length} Inspected
                      </span>
                    </div>

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
                                <td className="px-4 py-3.5">
                                  {formatReturnReason(item.return_reason)}
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
                                        className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-2xs cursor-pointer"
                                      >
                                        ✓ QC Pass &amp; Restock (+1)
                                      </button>
                                      <button
                                        disabled={busy === item.id}
                                        onClick={() => void handleQc(item.id, 'failed')}
                                        className="rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-2xs cursor-pointer"
                                      >
                                        ✕ QC Fail (Damage)
                                      </button>
                                    </div>
                                  ) : decided ? (
                                    <div className="inline-flex items-center gap-2">
                                      <span className="text-xs font-medium text-neutral-500">
                                        Inspected ({item.qc_status?.toUpperCase()})
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setEditingBoxId(box.id)}
                                        className="text-xs text-[#7A021D] font-bold hover:underline cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-2">
                                      <span className="text-xs text-neutral-400 italic">
                                        Awaiting warehouse receipt
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setEditingBoxId(box.id)}
                                        className="text-xs text-[#7A021D] font-bold hover:underline cursor-pointer"
                                      >
                                        Inspect
                                      </button>
                                    </div>
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

      {/* ── Edit & Inspect Modal / Dialog ── */}
      {editingBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-neutral-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 bg-[#FDF8F4] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7A021D] text-white font-bold text-sm shadow-xs">
                  {userInitials(editingBox.user?.full_name)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2C0505]">
                    Edit &amp; Inspect: {editingBox.user?.full_name ?? 'Member Return'}
                  </h2>
                  <p className="font-mono text-xs text-neutral-400">Box ID: {editingBox.id}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingBoxId(null)}
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Logistics Override */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  Logistics &amp; Pickup Tracking Status
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PICKUP_STEPS.map((step) => {
                    const active = editingBox.pickup_status === step.key;
                    return (
                      <button
                        key={step.key}
                        disabled={busy === editingBox.id}
                        onClick={() => void handlePickup(editingBox.id, step.key)}
                        className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                          active
                            ? 'bg-[#7A021D] text-white border-[#7A021D]'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#7A021D]'
                        }`}
                      >
                        <span className="text-lg mb-1">{step.icon}</span>
                        <span>{step.label}</span>
                        {active && <span className="mt-1 text-[10px] text-amber-200 uppercase tracking-widest">Active</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-neutral-200">
                  <span className="text-xs text-neutral-600 font-medium">
                    Warehouse Receipt: {editingBox.received_at ? `Received on ${new Date(editingBox.received_at).toLocaleDateString('en-IN')}` : 'Not yet received'}
                  </span>
                  {!editingBox.received_at && (
                    <button
                      type="button"
                      disabled={busy === editingBox.id}
                      onClick={() => void handleReceive(editingBox.id)}
                      className="rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-sky-700 shadow-xs cursor-pointer"
                    >
                      🏢 Mark Received Now
                    </button>
                  )}
                </div>
              </div>

              {/* Items QC Inspection */}
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Inspect &amp; Update Garments QC
                </p>

                {editingBox.returned_items.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-neutral-200 p-4 bg-white shadow-xs flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-[#2C0505]">{item.product_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-neutral-500 font-medium">Size: {item.variant_size}</span>
                            <span>•</span>
                            {formatReturnReason(item.return_reason)}
                          </div>
                        </div>

                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${qcBadge(item.qc_status)}`}>
                          {item.qc_status ?? 'Pending QC'}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-neutral-100">
                        <input
                          type="text"
                          placeholder="Optional inspection notes (stain, defect, tag missing)..."
                          value={itemNotes[item.id] ?? ''}
                          onChange={(e) => setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="flex-1 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#7A021D]"
                        />

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy === item.id}
                            onClick={() => void handleQc(item.id, 'passed', itemNotes[item.id])}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-2xs cursor-pointer"
                          >
                            ✓ Pass (+1)
                          </button>
                          <button
                            type="button"
                            disabled={busy === item.id}
                            onClick={() => void handleQc(item.id, 'failed', itemNotes[item.id])}
                            className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 shadow-2xs cursor-pointer"
                          >
                            ✕ Fail (Damage)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditingBoxId(null)}
                className="rounded-xl bg-[#7A021D] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#5e0116] transition-all cursor-pointer"
              >
                Done &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
