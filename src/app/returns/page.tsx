'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import { listBoxes, qcPassItem, qcFailItem } from '@/lib/boxes';
import type { Box, BoxItem } from '@/types/box';

interface BoxWithItemsPartial extends Box {
  items?: BoxItem[];
}

function rupees(minor: number | null) {
  if (minor == null) return '—';
  return `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function QcItemRow({ boxId, item, onDone, busy }: {
  boxId: string;
  item: BoxItem;
  onDone: () => void;
  busy: boolean;
}) {
  const { showToast } = useToast();
  const [rowBusy, setRowBusy] = useState(false);

  async function handle(action: 'pass' | 'fail') {
    setRowBusy(true);
    try {
      if (action === 'pass') await qcPassItem(boxId, item.id);
      else await qcFailItem(boxId, item.id);
      showToast('success', action === 'pass' ? 'QC Passed — restocked ✓' : 'QC Failed — not restocked');
      onDone();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'QC action failed');
    } finally {
      setRowBusy(false);
    }
  }

  const qcBg = { pending: 'bg-amber-50', passed: 'bg-emerald-50', failed: 'bg-red-50' }[item.qc_status];
  const qcText = { pending: 'text-amber-700', passed: 'text-emerald-700', failed: 'text-red-700' }[item.qc_status];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${qcBg}`}>
      {/* Thumbnail */}
      <div className="w-10 h-12 bg-white rounded-lg overflow-hidden shrink-0 relative border border-white/50">
        {item.product?.thumbnail_url ? (
          <Image src={item.product.thumbnail_url} alt={item.product?.name ?? ''} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-200 text-lg">▢</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-800 truncate">{item.product?.name ?? '—'}</p>
        <p className="text-xs text-neutral-500">{item.variant?.size}{item.variant?.colour ? ` · ${item.variant.colour}` : ''} · {rupees(item.product?.retail_price_minor ?? null)}</p>
      </div>

      {/* QC status / actions */}
      {item.qc_status === 'pending' ? (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => void handle('pass')}
            disabled={rowBusy || busy}
            className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-emerald-600 transition-colors"
          >
            ✓ Pass
          </button>
          <button
            onClick={() => void handle('fail')}
            disabled={rowBusy || busy}
            className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-red-600 transition-colors"
          >
            ✕ Fail
          </button>
        </div>
      ) : (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${qcBg} ${qcText}`}>
          {item.qc_status === 'passed' ? '✓ Passed' : '✕ Failed'}
        </span>
      )}
    </div>
  );
}

function ReturnBoxCard({ box, onRefresh }: { box: BoxWithItemsPartial; onRefresh: () => void }) {
  const returnedItems = (box.items ?? []).filter(i => i.decision === 'return');
  const pendingQc = returnedItems.filter(i => i.qc_status === 'pending').length;

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-50 flex items-center justify-between">
        <div>
          <Link href={`/boxes/${box.id}`} className="text-sm font-semibold text-neutral-800 hover:text-[#7A021D] transition-colors">
            Box #{box.id.slice(0, 8)}
          </Link>
          <p className="text-xs text-neutral-500 mt-0.5">{box.profiles?.full_name ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingQc > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
              {pendingQc} pending QC
            </span>
          )}
          {pendingQc === 0 && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
              All QC done ✓
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {returnedItems.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-4">No returned items</p>
        ) : (
          returnedItems.map(item => (
            <QcItemRow key={item.id} boxId={box.id} item={item} onDone={onRefresh} busy={false} />
          ))
        )}
      </div>
    </div>
  );
}

export default function ReturnsPage() {
  const { showToast } = useToast();
  const [boxes, setBoxes] = useState<BoxWithItemsPartial[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load boxes in decision_pending and returns_review states
      const [pending, review] = await Promise.all([
        listBoxes({ status: 'decision_pending', limit: 50 }),
        listBoxes({ status: 'returns_review', limit: 50 }),
      ]);
      setBoxes([...pending.boxes, ...review.boxes]);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="p-6 lg:p-8 max-w-[900px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Returns & QC</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Review returned items and mark QC pass or fail</p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex gap-2 mb-6">
        <span className="text-amber-500 text-sm">ℹ️</span>
        <div className="text-xs text-amber-700 leading-relaxed">
          <strong>QC Pass</strong> — item returned in good condition. Inventory is automatically restocked.<br />
          <strong>QC Fail</strong> — item damaged or lost. No restock. Box moves to completed once all items are QC&apos;d.
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-neutral-100 rounded-2xl" />)}
        </div>
      ) : boxes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-neutral-100">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-neutral-500 font-medium">No boxes pending QC</p>
          <p className="text-xs text-neutral-400 mt-1">Returned boxes will appear here once the member completes their session</p>
        </div>
      ) : (
        <div className="space-y-4">
          {boxes.map(box => (
            <ReturnBoxCard key={box.id} box={box} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}
