'use client';

import DropdownSelect from '@/components/ui/DropdownSelect';
import CategoryPicker from './CategoryPicker';
import LookMultiSelect from './LookMultiSelect';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import type { ProductPayload } from '@/types/product';

export interface BasicFieldsBlockProps {
  value: ProductPayload;
  onChange: (patch: Partial<ProductPayload>) => void;
}

export default function BasicFieldsBlock({ value, onChange }: BasicFieldsBlockProps): React.ReactElement {
  const { brands, collections, tree, materials, loading } = useTaxonomy();

  if (loading) return <div className="text-sm text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Name</label>
          <input
            type="text"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full rounded border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">SKU (optional)</label>
          <input
            type="text"
            value={value.sku ?? ''}
            onChange={(e) => onChange({ sku: e.target.value || null })}
            className="w-full rounded border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">Brand</label>
        <DropdownSelect
          value={value.brand_id}
          options={brands.map((b) => ({ value: b.id, label: b.name }))}
          placeholder="Pick a brand…"
          onChange={(v) => onChange({ brand_id: v })}
        />
      </div>

      <div>
        <label className="mb-2 block text-xs text-neutral-500">Category</label>
        <CategoryPicker
          value={{
            category_id: value.category_id,
            subcategory_id: value.subcategory_id,
            sub_subcategory_id: value.sub_subcategory_id,
          }}
          tree={tree}
          onChange={(v) => onChange(v)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Material</label>
          <DropdownSelect
            value={value.material_id}
            options={materials.map((m) => ({ value: m.id, label: m.name }))}
            placeholder="Pick a material…"
            onChange={(v) => onChange({ material_id: v })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Fabric details</label>
          <textarea
            rows={3}
            value={value.fabric_details ?? ''}
            onChange={(e) => onChange({ fabric_details: e.target.value || null })}
            placeholder="Marketing copy about the fabric (e.g. luxe satin with a soft drape)"
            className="w-full rounded border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs text-neutral-500">Description</label>
        <textarea
          rows={4}
          value={value.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value || null })}
          className="w-full rounded border border-neutral-200 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs text-neutral-500">Looks</label>
        <LookMultiSelect
          value={value.look_ids}
          collections={collections}
          onChange={(ids) => onChange({ look_ids: ids })}
        />
      </div>
    </div>
  );
}
