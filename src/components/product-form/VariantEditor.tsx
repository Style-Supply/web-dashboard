'use client';

import type { ProductVariant } from '@/types/product';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AutocompleteInput from './AutocompleteInput';

const SIZES = ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'] as const;

interface VariantEditorProps {
  variants: ProductVariant[];
  addVariant: () => void;
  removeVariant: (index: number) => void;
  updateVariant: (index: number, patch: Partial<ProductVariant>) => void;
}

function tupleKey(v: ProductVariant): string {
  return `${v.size}__${v.colour ?? ''}__${v.location ?? ''}`;
}

export default function VariantEditor({
  variants,
  addVariant,
  removeVariant,
  updateVariant,
}: VariantEditorProps): React.ReactElement {
  const dupes = new Set<number>();
  const seen = new Map<string, number>();
  variants.forEach((v, i) => {
    if (!v.size) return;
    const key = tupleKey(v);
    if (seen.has(key)) {
      dupes.add(i);
      dupes.add(seen.get(key) as number);
    } else {
      seen.set(key, i);
    }
  });

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Variants</h2>
      <div className="space-y-2">
        {variants.map((v, i) => {
          const dup = dupes.has(i);
          return (
            <div
              key={i}
              className={`grid grid-cols-[100px_1fr_100px_1fr_auto] items-center gap-2 rounded border p-2 ${dup ? 'border-red-500 bg-red-50' : 'border-neutral-200'}`}
            >
              <select
                value={v.size}
                onChange={(e) => updateVariant(i, { size: e.target.value })}
                className="h-10 rounded border border-neutral-300 bg-white px-2 text-sm"
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s || '—'}
                  </option>
                ))}
              </select>
              <AutocompleteInput
                field="colour"
                value={v.colour ?? ''}
                onChange={(val) => updateVariant(i, { colour: val || null })}
                placeholder="Colour"
              />
              <Input
                type="number"
                min={0}
                value={v.quantity}
                onChange={(e) => updateVariant(i, { quantity: Number(e.target.value) || 0 })}
              />
              <AutocompleteInput
                field="location"
                value={v.location ?? ''}
                onChange={(val) => updateVariant(i, { location: val || null })}
                placeholder="Location"
              />
              <Button variant="ghost" size="sm" type="button" onClick={() => removeVariant(i)}>
                ✕
              </Button>
            </div>
          );
        })}
      </div>
      <Button variant="secondary" size="sm" type="button" onClick={addVariant}>
        + Add variant
      </Button>
    </section>
  );
}

export function hasDuplicateVariants(variants: ProductVariant[]): boolean {
  const seen = new Set<string>();
  for (const v of variants) {
    if (!v.size) continue;
    const key = tupleKey(v);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}
