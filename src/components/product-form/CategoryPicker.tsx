'use client';

import { useMemo } from 'react';
import DropdownSelect from '@/components/ui/DropdownSelect';
import type { CategoryTreeNode } from '@/types/taxonomy';

export interface CategoryPickerValue {
  category_id: string | null;
  subcategory_id: string | null;
  sub_subcategory_id: string | null;
}

export interface CategoryPickerProps {
  value: CategoryPickerValue;
  tree: CategoryTreeNode[];
  onChange: (v: CategoryPickerValue) => void;
}

export default function CategoryPicker({ value, tree, onChange }: CategoryPickerProps): React.ReactElement {
  const l1Options = tree.map((n) => ({ value: n.id, label: n.name }));

  const l1Node = useMemo(() => tree.find((n) => n.id === value.category_id) ?? null, [tree, value.category_id]);
  const l2Options = (l1Node?.children ?? []).map((n) => ({ value: n.id, label: n.name }));

  const l2Node = useMemo(
    () => l1Node?.children.find((n) => n.id === value.subcategory_id) ?? null,
    [l1Node, value.subcategory_id],
  );
  const l3Options = (l2Node?.children ?? []).map((n) => ({ value: n.id, label: n.name }));

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Type</label>
        <DropdownSelect
          value={value.category_id}
          options={l1Options}
          placeholder="Select type…"
          onChange={(v) => onChange({ category_id: v, subcategory_id: null, sub_subcategory_id: null })}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Subcategory</label>
        <DropdownSelect
          value={value.subcategory_id}
          options={l2Options}
          placeholder={l1Node ? 'Select subcategory…' : 'Pick a type first'}
          disabled={!l1Node}
          onChange={(v) => onChange({ ...value, subcategory_id: v, sub_subcategory_id: null })}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Sub-subcategory</label>
        <DropdownSelect
          value={value.sub_subcategory_id}
          options={l3Options}
          placeholder={l2Node && l3Options.length > 0 ? 'Select…' : 'N/A'}
          disabled={!l2Node || l3Options.length === 0}
          onChange={(v) => onChange({ ...value, sub_subcategory_id: v })}
        />
      </div>
    </div>
  );
}
