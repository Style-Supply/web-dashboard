'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import { getBox, packBox, dispatchBox, deliverBox, qcPassItem, qcFailItem } from '@/lib/boxes';
import type { BoxWithItems, BoxStatus, BoxItem } from '@/types/box';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rupees(minor: number | null) {
  if (minor == null) return '—';
  return `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

// ─── Lifecycle Stepper ────────────────────────────────────────────────────────

const LIFECYCLE: { key: BoxStatus; label: string; ts: keyof BoxWithItems }[] = [
  { key: 'building',               label: 'Building',             ts: 'created_at' },
  { key: 'confirmed',              label: 'Confirmed',             ts: 'confirmed_at' },
  { key: 'packing',               label: 'Packing',               ts: 'packed_at' },
  { key: 'out_for_delivery',      label: 'Dispatched',            ts: 'dispatched_at' },
  { key: 'delivered',             label: 'Delivered',             ts: 'delivered_at' },
  { key: 'boutique_session_active', label: 'Boutique Session',    ts: 'session_started_at' },
  { key: 'decision_pending',      label: 'Decisions Made',        ts: 'session_ended_at' },
  { key: 'completed',             label: 'Completed',             ts: 'session_ended_at' },
];

const STATUS_ORDER = LIFECYCLE.map(s => s.key);

function currentIndex(status: BoxStatus) {
  const i = STATUS_ORDER.indexOf(status);
  return i === -1 ? 0 : i;
}

function LifecycleStepper({ box, onAction, busy }: {
  box: BoxWithItems;
  onAction: (action: string) => void;
  busy: boolean;
}) {
  const ci = currentIndex(box.status);

  const ACTIONS: Partial<Record<BoxStatus, { label: string; action: string; color?: string }>> = {
    confirmed:        { label: '📦 Start Packing',   action: 'pack' },
    packing:         { label: '🚚 Dispatch Box',     action: 'dispatch' },
    out_for_delivery: { label: '✅ Mark Delivered',   action: 'deliver' },
  };

  const nextAction = ACTIONS[box.status];

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6">
      <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-5">Lifecycle</h2>

      <div className="space-y-0">
        {LIFECYCLE.map((step, i) => {
          const done = i < ci;
          const active = i === ci;
          const pending = i > ci;

          return (
            <div key={step.key} className="flex gap-3">
              {/* Indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  done ? 'bg-emerald-500 text-white' :
                  active ? 'bg-[#7A021D] text-white ring-4 ring-red-100' :
                  'bg-neutral-100 text-neutral-400'
                }`}>
                  {done ? '✓' : i + 1}
                </div>
                {i < LIFECYCLE.length - 1 && (
                  <div className={`w-0.5 h-6 ${done ? 'bg-emerald-300' : 'bg-neutral-100'}`} />
                )}
              </div>

              {/* Content */}
              <div className={`pb-4 flex-1 min-w-0 ${pending ? 'opacity-40' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${active ? 'text-[#7A021D]' : done ? 'text-neutral-700' : 'text-neutral-400'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-neutral-400">{fmtDate(box[step.ts] as string | null) ?? ''}</p>
                </div>
                {active && nextAction && (
                  <button
                    onClick={() => onAction(nextAction.action)}
                    disabled={busy}
                    className="mt-2 px-4 py-1.5 bg-[#7A021D] text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-[#960225] transition-colors"
                  >
                    {busy ? 'Working…' : nextAction.label}
                  </button>
                )}
                {active && box.status === 'boutique_session_active' && box.session_ends_at && (
                  <p className="mt-1 text-xs text-amber-600 font-medium">
                    Session ends: {fmtDate(box.session_ends_at)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({ item, onQc, busy }: {
  item: BoxItem;
  onQc: (itemId: string, action: 'pass' | 'fail') => void;
  busy: boolean;
}) {
  const decisionColor = {
    keep: 'bg-emerald-100 text-emerald-700',
    return: 'bg-orange-100 text-orange-700',
    pending: 'bg-neutral-100 text-neutral-500',
  }[item.decision];

  const qcColor = {
    passed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
  }[item.qc_status];

  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-4 flex gap-3">
      {/* Thumbnail */}
      <div className="w-16 h-20 bg-neutral-50 rounded-lg overflow-hidden shrink-0 relative">
        {item.product?.thumbnail_url ? (
          <Image src={item.product.thumbnail_url} alt={item.product?.name ?? ''} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xl">▢</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-800 truncate">{item.product?.name ?? '—'}</p>
        <p className="text-xs text-neutral-400 mt-0.5">{item.variant?.size} {item.variant?.colour ? `· ${item.variant.colour}` : ''}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{rupees(item.product?.retail_price_minor ?? null)}</p>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${decisionColor}`}>
            {item.decision}
          </span>
          {item.decision === 'return' && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${qcColor}`}>
              QC: {item.qc_status}
            </span>
          )}
          {item.purchase_price_minor != null && (
            <span className="text-[11px] text-neutral-400">Purchase: {rupees(item.purchase_price_minor)}</span>
          )}
        </div>

        {/* QC buttons for returned items */}
        {item.decision === 'return' && item.qc_status === 'pending' && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onQc(item.id, 'pass')}
              disabled={busy}
              className="px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-emerald-600 transition-colors"
            >
              ✓ QC Pass
            </button>
            <button
              onClick={() => onQc(item.id, 'fail')}
              disabled={busy}
              className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-red-600 transition-colors"
            >
              ✕ QC Fail
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BoxDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [box, setBox] = useState<BoxWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const data = await getBox(params.id as string) as BoxWithItems;
      setBox(data);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load box');
    } finally {
      setLoading(false);
    }
  }, [params.id, showToast]);

  useEffect(() => { void load(); }, [load]);

  async function handleAction(action: string) {
    if (!box || busy) return;
    setBusy(true);
    try {
      let updated;
      if (action === 'pack') updated = await packBox(box.id);
      else if (action === 'dispatch') updated = await dispatchBox(box.id);
      else if (action === 'deliver') updated = await deliverBox(box.id);
      else return;
      setBox(prev => prev ? { ...prev, ...updated } : null);
      showToast('success', `Box moved to: ${(updated as BoxWithItems).status.replace(/_/g, ' ')}`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleQc(itemId: string, action: 'pass' | 'fail') {
    if (!box || busy) return;
    setBusy(true);
    try {
      if (action === 'pass') await qcPassItem(box.id, itemId);
      else await qcFailItem(box.id, itemId);
      showToast('success', `QC ${action === 'pass' ? 'passed ✓' : 'failed ✗'}`);
      await load(); // Reload to get updated item + box status
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'QC action failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-6 bg-neutral-100 rounded w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-neutral-100 rounded-2xl lg:col-span-1" />
          <div className="h-80 bg-neutral-100 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!box) {
    return (
      <div className="p-8 text-center">
        <p className="text-neutral-500">Box not found</p>
        <Link href="/boxes" className="mt-4 inline-block text-sm text-[#7A021D] underline">Back to boxes</Link>
      </div>
    );
  }

  const returnedItems = box.items?.filter(i => i.decision === 'return') ?? [];
  const keptItems = box.items?.filter(i => i.decision === 'keep') ?? [];
  const pendingItems = box.items?.filter(i => i.decision === 'pending') ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/boxes')} className="text-neutral-400 hover:text-neutral-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Box #{box.id.slice(0, 8)}</h1>
          <p className="text-sm text-neutral-500">{fmtDate(box.created_at)}</p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
          box.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
          box.status === 'cancelled' ? 'bg-neutral-200 text-neutral-600' :
          box.status === 'boutique_session_active' ? 'bg-amber-100 text-amber-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {box.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Lifecycle + User Info */}
        <div className="space-y-4">
          <LifecycleStepper box={box} onAction={handleAction} busy={busy} />

          {/* User info */}
          <div className="bg-white rounded-2xl border border-neutral-100 p-5">
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Member</h2>
            <p className="text-sm font-semibold text-neutral-800">{box.user?.full_name ?? box.profiles?.full_name ?? '—'}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{box.user?.phone ?? box.profiles?.phone ?? '—'}</p>
            {box.user?.email && <p className="text-xs text-neutral-400 mt-0.5">{box.user.email}</p>}
          </div>

          {/* Delivery address */}
          {box.delivery_address && (
            <div className="bg-white rounded-2xl border border-neutral-100 p-5">
              <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Delivery Address</h2>
              <p className="text-sm text-neutral-700">{box.delivery_address.full_name}</p>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                {box.delivery_address.line1}{box.delivery_address.line2 ? `, ${box.delivery_address.line2}` : ''}<br />
                {box.delivery_address.city}, {box.delivery_address.state} {box.delivery_address.zip}
              </p>
              {box.tracking_number && (
                <p className="text-xs text-neutral-400 mt-2">Tracking: {box.tracking_number}</p>
              )}
            </div>
          )}
        </div>

        {/* Right — Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-700">Items ({box.items?.length ?? 0}/5)</h2>
              <div className="flex gap-2 text-xs">
                {keptItems.length > 0 && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">{keptItems.length} kept</span>}
                {returnedItems.length > 0 && <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full font-medium">{returnedItems.length} returning</span>}
                {pendingItems.length > 0 && <span className="px-2 py-0.5 bg-neutral-50 text-neutral-500 rounded-full font-medium">{pendingItems.length} pending</span>}
              </div>
            </div>
            <div className="space-y-3">
              {(box.items ?? []).map(item => (
                <ItemCard key={item.id} item={item} onQc={handleQc} busy={busy} />
              ))}
              {(!box.items || box.items.length === 0) && (
                <p className="text-sm text-neutral-400 text-center py-8">No items in this box yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
