'use client';

import TaxonomyListPage from '@/components/taxonomy/TaxonomyListPage';
import { Colours } from '@/lib/taxonomy-api';
import type { Colour } from '@/types/taxonomy';

export default function ColoursPage() {
  return (
    <TaxonomyListPage<Colour>
      title="Colours"
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'hex',  label: 'Hex',  type: 'colour', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'sort_order', label: 'Order', type: 'number' },
      ]}
      api={Colours}
    />
  );
}
