'use client';

import { useState } from 'react';
import DropdownSelect from '@/components/ui/DropdownSelect';
import ColourPicker from './ColourPicker';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { request } from '@/lib/api';
import type { ProductVariant } from '@/types/product';

const SIZES: ProductVariant['size'][] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'];

export interface VariantEditorProps {
  value: ProductVariant[];
  onChange: (next: ProductVariant[]) => void;
}

function tupleKey(v: ProductVariant): string {
  const colourKey = v.colour_id ?? (v.custom_colour ? `_custom_${v.custom_colour.toLowerCase().trim()}` : '');
  return `${v.size}__${colourKey}__${v.location_id ?? ''}`;
}

/** Stock badge shown per variant row */
function StockBadge({ qty }: { qty: number }) {
  if (qty === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Out of Stock
      </span>
    );
  }
  if (qty <= 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Low Stock ({qty})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      In Stock ({qty})
    </span>
  );
}

/** Quick ±1 stock adjust button (only for variants that are already saved — have an id) */
function QuickAdjust({
  variantId,
  currentQty,
  onAdjusted,
}: {
  variantId: string;
  currentQty: number;
  onAdjusted: (newQty: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function adjust(delta: number) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await request<{ variant: { quantity: number } }>(
        `/api/admin/products/variants/${variantId}/stock/adjust`,
        { method: 'POST', body: JSON.stringify({ delta }) },
      );
      onAdjusted(res.variant.quantity);
    } catch {
      // silent — form qty still reflects local state
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        title="Remove 1"
        disabled={busy || currentQty <= 0}
        onClick={() => void adjust(-1)}
        className="flex h-6 w-6 items-center justify-center rounded border border-neutral-200 text-neutral-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors text-sm font-bold"
      >
        −
      </button>
      <button
        type="button"
        title="Add 1"
        disabled={busy}
        onClick={() => void adjust(+1)}
        className="flex h-6 w-6 items-center justify-center rounded border border-neutral-200 text-neutral-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-30 transition-colors text-sm font-bold"
      >
        +
      </button>
    </div>
  );
}

export default function VariantEditor({ value, onChange }: VariantEditorProps): React.ReactElement {
  const { colours, locations, loading } = useTaxonomy();

  if (loading) return <div className="text-sm text-neutral-400">Loading…</div>;

  function add() {
    onChange([
      ...value,
      { size: 'M', colour_id: null, custom_colour: null, quantity: 1, location_id: null },
    ]);
  }

  function update(index: number, patch: Partial<ProductVariant>) {
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  // Duplicate detection
  const counts = new Map<string, number>();
  for (const v of value) counts.set(tupleKey(v), (counts.get(tupleKey(v)) ?? 0) + 1);

  const totalStock = value.reduce((sum, v) => sum + (v.quantity ?? 0), 0);
  const outOfStockCount = value.filter((v) => v.quantity <= 0).length;

  return (
    <div className="space-y-3">
      {/* Stock Summary Banner */}
      {value.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-2.5">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-neutral-400 uppercase tracking-wide">Total Stock</p>
              <p className="text-lg font-extrabold text-[#2C0505]">{totalStock}</p>
            </div>
            <div className="w-px h-8 bg-neutral-200" />
            <div className="text-center">
              <p className="text-xs text-neutral-400 uppercase tracking-wide">Variants</p>
              <p className="text-lg font-extrabold text-[#2C0505]">{value.length}</p>
            </div>
            {outOfStockCount > 0 && (
              <>
                <div className="w-px h-8 bg-neutral-200" />
                <div className="text-center">
                  <p className="text-xs text-red-400 uppercase tracking-wide">Out of Stock</p>
                  <p className="text-lg font-extrabold text-red-600">{outOfStockCount}</p>
                </div>
              </>
            )}
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-bold ${totalStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {totalStock > 0 ? '● Available' : '● Out of Stock'}
          </div>
        </div>
      )}

      {/* Variant Rows */}
      {value.map((v, i) => {
        const dup = (counts.get(tupleKey(v)) ?? 0) > 1;
        const isSaved = !!v.id;
        return (
          <div
            key={i}
            className={`rounded-xl border p-3 space-y-2 ${dup ? 'border-red-300 bg-red-50' : v.quantity <= 0 ? 'border-red-200 bg-red-50/40' : 'border-neutral-200 bg-white'}`}
          >
            {/* Row 1: Size, Colour, Location */}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr_1fr] md:items-center">
              <DropdownSelect
                value={v.size}
                allowClear={false}
                options={SIZES.map((s) => ({ value: s, label: s }))}
                onChange={(val) => update(i, { size: val as ProductVariant['size'] })}
              />
              <ColourPicker
                value={{ colour_id: v.colour_id, custom_colour: v.custom_colour }}
                colours={colours}
                onChange={(p) => update(i, { colour_id: p.colour_id, custom_colour: p.custom_colour })}
              />
              <DropdownSelect
                value={v.location_id}
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
                placeholder="Location"
                onChange={(val) => update(i, { location_id: val })}
              />
            </div>

            {/* Row 2: Quantity + badge + quick adjust + remove */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Quantity input */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-neutral-500 font-medium">Qty:</label>
                <input
                  type="number"
                  min={0}
                  value={v.quantity}
                  onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })}
                  className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm text-center focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D] outline-none"
                />
              </div>

              {/* Stock badge */}
              <StockBadge qty={v.quantity} />

              {/* Quick ±1 adjust (only for saved variants) */}
              {isSaved && v.id && (
                <QuickAdjust
                  variantId={v.id}
                  currentQty={v.quantity}
                  onAdjusted={(newQty) => update(i, { quantity: newQty })}
                />
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Remove button */}
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            </div>

            {dup && <p className="text-xs text-red-600 font-medium">⚠ Duplicate — same size + colour + location.</p>}
          </div>
        );
      })}

      {/* Add variant button */}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 py-3 text-sm text-neutral-500 hover:border-[#7A021D] hover:bg-[#FDF8F4] hover:text-[#7A021D] transition-all"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add variant
      </button>
    </div>
  );
}

export { tupleKey };
