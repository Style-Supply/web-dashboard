'use client';

import type { ProductListQuery } from '@/types/product';
import Input from '@/components/ui/Input';
import AutocompleteInput from '@/components/product-form/AutocompleteInput';

interface ProductFiltersProps {
  query: ProductListQuery;
  onChange: (next: ProductListQuery) => void;
}

const STATUSES: Array<'all' | 'draft' | 'published'> = ['all', 'draft', 'published'];

export default function ProductFilters({
  query,
  onChange,
}: ProductFiltersProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-64">
        <Input
          placeholder="Search"
          value={query.q ?? ''}
          onChange={(e) => onChange({ ...query, q: e.target.value, offset: 0 })}
        />
      </div>
      <div className="w-48">
        <AutocompleteInput
          field="brand"
          value={query.brand ?? ''}
          onChange={(v) => onChange({ ...query, brand: v || undefined, offset: 0 })}
          placeholder="Brand"
        />
      </div>
      <div className="w-48">
        <AutocompleteInput
          field="category"
          value={query.category ?? ''}
          onChange={(v) => onChange({ ...query, category: v || undefined, offset: 0 })}
          placeholder="Category"
        />
      </div>
      <div className="flex gap-1 rounded-full bg-neutral-100 p-1 text-xs">
        {STATUSES.map((s) => {
          const active = (query.status ?? 'all') === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ ...query, status: s, offset: 0 })}
              className={`rounded-full px-3 py-1.5 capitalize ${active ? 'bg-white shadow' : 'text-neutral-600'}`}
            >
              {s}
            </button>
          );
        })}
      </div>
      <select
        value={query.sort ?? '-created_at'}
        onChange={(e) => onChange({ ...query, sort: e.target.value })}
        className="h-10 rounded border border-neutral-300 bg-white px-3 text-sm"
      >
        <option value="-created_at">Newest</option>
        <option value="created_at">Oldest</option>
        <option value="name">Name A–Z</option>
        <option value="-retail_price_minor">Price high→low</option>
        <option value="retail_price_minor">Price low→high</option>
      </select>
    </div>
  );
}
