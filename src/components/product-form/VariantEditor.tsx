'use client';

import DropdownSelect from '@/components/ui/DropdownSelect';
import ColourPicker from './ColourPicker';
import { useTaxonomy } from '@/hooks/useTaxonomy';
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

  return (
    <div className="space-y-2">
      {value.map((v, i) => {
        const dup = (counts.get(tupleKey(v)) ?? 0) > 1;
        return (
          <div
            key={i}
            className={`grid grid-cols-1 gap-2 rounded border p-3 md:grid-cols-[120px_1fr_120px_1fr_40px] md:items-center ${dup ? 'border-red-300 bg-red-50' : 'border-neutral-200'}`}
          >
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
            <input
              type="number"
              min={0}
              value={v.quantity}
              onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })}
              className="w-full rounded border border-neutral-200 px-3 py-2 text-sm"
            />
            <DropdownSelect
              value={v.location_id}
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="Location"
              onChange={(val) => update(i, { location_id: val })}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="rounded border border-neutral-200 px-2 py-2 text-sm text-neutral-500 hover:border-red-300 hover:text-red-600"
            >
              ×
            </button>
            {dup && <p className="md:col-span-5 text-xs text-red-600">Duplicate row — same size + colour + location.</p>}
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="rounded border border-dashed border-neutral-300 px-3 py-2 text-sm hover:border-neutral-400"
      >
        + Add variant
      </button>
    </div>
  );
}

export { tupleKey };
