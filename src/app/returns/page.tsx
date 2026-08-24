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

const PICKUP_STEPS: Array<{
  key: 'scheduled' | 'in_transit' | 'picked_up' | 'received_at_warehouse' | 'completed';
  label: string;
  icon: string;
}> = [
  { key: 'scheduled', label: '1. Pickup Scheduled', icon: '📅' },
  { key: 'in_transit', label: '2. Pickup In Transit', icon: '🚚' },
  { key: 'picked_up', label: '3. Pickup Completed', icon: '📦' },
  { key: 'received_at_warehouse', label: '4. Received at Style Supply', icon: '🏢' },
  { key: 'completed', label: '5. Completed', icon: '✨' },
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

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function formatShortTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function getStepTimestamp(box: ReturnBox, stepKey: string): string | null {
  if (stepKey === 'scheduled') {
    return box.decisions_locked_at || box.paid_at || box.created_at || null;
  }
  if (stepKey === 'in_transit') {
    if (box.pickup_status === 'in_transit' || box.pickup_status === 'picked_up' || box.pickup_status === 'received_at_warehouse' || box.status === 'completed') {
      return box.updated_at || box.received_at || box.decisions_locked_at || null;
    }
  }
  if (stepKey === 'picked_up') {
    if (box.pickup_status === 'picked_up' || box.pickup_status === 'received_at_warehouse' || box.status === 'completed') {
      return box.received_at || box.updated_at || null;
    }
  }
  if (stepKey === 'received_at_warehouse') {
    return box.received_at || null;
  }
  if (stepKey === 'completed') {
    return box.status === 'completed' ? (box.updated_at || box.received_at || null) : null;
  }
  return null;
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

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const { returns } = await listReturns();
      setReturns(returns);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load returns pipeline');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load(true);
  }, [load]);

  const filteredReturns = useMemo(() => {
    const list = returns.filter((box) => {
      const matchesSearch =
        !search.trim() ||
        box.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        box.id.toLowerCase().includes(search.toLowerCase()) ||
        box.tracking_number?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === 'needs_pickup') {
        return box.pickup_status !== 'picked_up' && box.pickup_status !== 'received_at_warehouse' && box.status !== 'completed';
      }
      if (filterTab === 'needs_qc') {
        return Boolean(box.received_at) && box.returned_items.some((i) => !i.qc_status);
      }
      return true;
    });

    // Always sort latest to oldest (newest first)
    return list.sort((a, b) => {
      const timeA = new Date(a.created_at || a.decisions_locked_at || 0).getTime();
      const timeB = new Date(b.created_at || b.decisions_locked_at || 0).getTime();
      return timeB - timeA;
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

  const [pickupTrackingInputs, setPickupTrackingInputs] = useState<Record<string, string>>({});

  async function handlePickup(
    boxId: string,
    status: 'scheduled' | 'in_transit' | 'picked_up' | 'received_at_warehouse' | 'completed',
    customTracking?: string,
  ): Promise<void> {
    let trackingNumber = customTracking;
    if (status === 'in_transit' && trackingNumber === undefined) {
      const box = returns.find((b) => b.id === boxId);
      const entered = prompt('Enter Return Pickup Tracking Number (AWB / Courier Code):', box?.tracking_number || '');
      if (entered === null) return; // User cancelled
      trackingNumber = entered.trim();
    }

    setBusy(boxId);
    // Live in-place optimistic update
    setReturns((prev) =>
      prev.map((box) =>
        box.id === boxId
          ? {
              ...box,
              pickup_status: status === 'completed' ? 'received_at_warehouse' : status,
              status: status === 'completed' ? 'completed' : box.status,
              tracking_number: trackingNumber !== undefined ? trackingNumber : box.tracking_number,
            }
          : box
      )
    );
    try {
      await setPickupStatus(boxId, status, trackingNumber);
      showToast('success', `Pickup status updated to ${status.replace('_', ' ')}`);
      await load(false);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update pickup');
      await load(false);
    } finally {
      setBusy(null);
    }
  }

  async function handleReceive(boxId: string): Promise<void> {
    setBusy(boxId);
    const now = new Date().toISOString();
    // Live in-place optimistic update
    setReturns((prev) =>
      prev.map((box) =>
        box.id === boxId
          ? { ...box, received_at: now, pickup_status: 'received_at_warehouse' }
          : box
      )
    );
    try {
      await markReceived(boxId);
      showToast('success', 'Returned items marked as received at warehouse');
      await load(false);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to mark received');
      await load(false);
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
    // Live in-place optimistic update
    setReturns((prev) =>
      prev.map((box) => ({
        ...box,
        returned_items: box.returned_items.map((it) =>
          it.id === itemId ? { ...it, qc_status: result } : it
        ),
      }))
    );
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
      await load(false);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'QC inspection failed');
      await load(false);
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
            onClick={() => void load(true)}
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
            <span>Refresh</span>
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
            const currentStepIdx = box.status === 'completed' || box.pickup_status === 'completed'
              ? 4
              : box.pickup_status === 'received_at_warehouse'
              ? 3
              : box.pickup_status === 'picked_up'
              ? 2
              : box.pickup_status === 'in_transit'
              ? 1
              : 0;

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
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <p className="font-mono text-xs text-neutral-400">Box ID: {box.id}</p>
                        {box.decisions_locked_at && (
                          <>
                            <span className="text-neutral-300">•</span>
                            <p className="text-xs text-[#7A021D] font-medium">
                              Return Initiated: {formatDateTime(box.decisions_locked_at)}
                            </p>
                          </>
                        )}
                        {box.created_at && !box.decisions_locked_at && (
                          <>
                            <span className="text-neutral-300">•</span>
                            <p className="text-xs text-neutral-500 font-medium">
                              Created: {formatDateTime(box.created_at)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {box.received_at ? (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 shadow-2xs">
                        🏢 Received: {formatDateTime(box.received_at)}
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                        ⏳ Awaiting Style Supply Receipt
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
                        Logistics &amp; Pickup Tracking (Step-by-Step Progress)
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
                        const isCompleted = idx < currentStepIdx;
                        const isCurrent = idx === currentStepIdx;
                        const isNext = idx === currentStepIdx + 1;
                        const isFuture = idx > currentStepIdx + 1;
                        const timestamp = getStepTimestamp(box, step.key);

                        return (
                          <div key={step.key} className="flex items-center gap-3">
                            <button
                              disabled={busy === box.id || isFuture}
                              onClick={() => void handlePickup(box.id, step.key)}
                              className={`flex flex-col items-start gap-1 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-2xs ${
                                isCurrent
                                  ? 'bg-[#7A021D] text-white ring-2 ring-[#7A021D]/30 shadow-md cursor-default'
                                  : isCompleted
                                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer'
                                    : isNext
                                      ? 'border-2 border-dashed border-[#7A021D] bg-white text-[#7A021D] hover:bg-[#7A021D] hover:text-white cursor-pointer shadow-xs'
                                      : 'border border-neutral-200 text-neutral-400 bg-neutral-50/50 cursor-not-allowed opacity-60'
                              } disabled:cursor-not-allowed`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span>{isCompleted ? '✓' : step.icon}</span>
                                <span>{isNext ? `👉 Mark: ${step.label}` : step.label}</span>
                                {isCurrent && (
                                  <span className="ml-1 rounded-full bg-amber-300 text-[#7A021D] text-[9px] font-extrabold px-1.5 py-0.2 uppercase tracking-wider">
                                    Current
                                  </span>
                                )}
                              </div>
                              {(isCompleted || isCurrent) && timestamp && (
                                <span className={`text-[10px] font-semibold tracking-tight ${isCurrent ? 'text-amber-200' : 'text-emerald-700'}`}>
                                  🕒 {formatShortTime(timestamp)}
                                </span>
                              )}
                            </button>
                            {idx < PICKUP_STEPS.length - 1 && (
                              <span className={`font-bold text-sm ${idx < currentStepIdx ? 'text-emerald-500' : 'text-neutral-300'}`}>
                                →
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {box.pickup_status === 'picked_up' && !box.received_at && (
                        <button
                          disabled={busy === box.id}
                          onClick={() => void handleReceive(box.id)}
                          className="ml-auto flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-sky-700 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          🏢 Mark Received at Style Supply
                        </button>
                      )}
                    </div>

                    {/* Return Pickup Tracking Number Row */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-neutral-200/60">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-500">
                          Return Pickup Tracking:
                        </span>
                        <span className="font-mono text-xs font-bold text-[#7A021D] bg-[#7A021D]/5 px-2.5 py-0.5 rounded-full border border-[#7A021D]/20">
                          {box.tracking_number || 'Not Set'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const entered = prompt('Enter Return Pickup Tracking Number (AWB / Courier Code):', box.tracking_number || '');
                          if (entered !== null) {
                            void handlePickup(box.id, (box.pickup_status as any) || 'in_transit', entered.trim());
                          }
                        }}
                        className="text-xs font-bold text-[#7A021D] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>✏️</span>
                        <span>{box.tracking_number ? 'Change Tracking Code' : 'Add Pickup Tracking Code'}</span>
                      </button>
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

                    <div className="overflow-x-auto rounded-xl border border-neutral-200">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase text-neutral-500">
                          <tr>
                            <th className="py-3 px-4">Returned Product</th>
                            <th className="py-3 px-4">Size Variant</th>
                            <th className="py-3 px-4">Return Reason</th>
                            <th className="py-3 px-4">QC Status</th>
                            <th className="py-3 px-4 text-right">Inspection Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                          {box.returned_items.map((item) => (
                            <tr key={item.id} className="hover:bg-neutral-50/50">
                              <td className="py-3 px-4 font-bold text-[#2C0505]">{item.product_name}</td>
                              <td className="py-3 px-4 text-neutral-600">{item.variant_size}</td>
                              <td className="py-3 px-4">{formatReturnReason(item.return_reason)}</td>
                              <td className="py-3 px-4">
                                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${qcBadge(item.qc_status)}`}>
                                  {item.qc_status ?? 'Pending'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    disabled={busy === item.id}
                                    onClick={() => void handleQc(item.id, 'passed')}
                                    className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-2xs cursor-pointer"
                                  >
                                    ✓ QC Pass &amp; Restock (+1)
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy === item.id}
                                    onClick={() => void handleQc(item.id, 'failed')}
                                    className="rounded-xl bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-2xs cursor-pointer"
                                  >
                                    ✕ QC Fail (Damage)
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
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

      {/* ── Edit & Inspect Modal ── */}
      {editingBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 bg-[#FDF8F4] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7A021D] text-white font-bold text-xs shadow-xs">
                  {userInitials(editingBox.user?.full_name)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#2C0505]">
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
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {PICKUP_STEPS.map((step) => {
                    const active =
                      step.key === 'completed'
                        ? editingBox.status === 'completed'
                        : step.key === 'received_at_warehouse'
                        ? Boolean(editingBox.received_at) && editingBox.status !== 'completed'
                        : editingBox.status !== 'completed' && editingBox.pickup_status === step.key && (step.key !== 'picked_up' || !editingBox.received_at);
                    const timestamp = getStepTimestamp(editingBox, step.key);
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
                        {timestamp && (
                          <span className={`mt-1 text-[10px] font-semibold tracking-tight ${active ? 'text-amber-200' : 'text-neutral-500'}`}>
                            {formatShortTime(timestamp)}
                          </span>
                        )}
                        {active && !timestamp && <span className="mt-1 text-[10px] text-amber-200 uppercase tracking-widest">Active</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-neutral-200">
                  <span className="text-xs text-neutral-600 font-medium">
                    Warehouse Receipt: {editingBox.received_at ? `Received at Style Supply on ${formatDateTime(editingBox.received_at)}` : 'Not yet received'}
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

              {/* Pickup Tracking Code Card */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  Return Pickup Tracking Code (Courier / AWB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. DELHIVERY_RET_987654321, BLUEDART_12345"
                    value={pickupTrackingInputs[editingBox.id] ?? (editingBox.tracking_number || '')}
                    onChange={(e) => setPickupTrackingInputs((prev) => ({ ...prev, [editingBox.id]: e.target.value }))}
                    className="flex-1 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-mono shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#7A021D]"
                  />
                  <button
                    type="button"
                    disabled={busy === editingBox.id}
                    onClick={async () => {
                      const code = pickupTrackingInputs[editingBox.id] ?? editingBox.tracking_number ?? '';
                      await handlePickup(editingBox.id, (editingBox.pickup_status as any) || 'in_transit', code);
                      showToast('success', 'Return pickup tracking code saved successfully');
                    }}
                    className="rounded-xl bg-[#7A021D] px-4 py-2 text-xs font-bold text-white hover:bg-[#5e0116] shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    Save Tracking
                  </button>
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
