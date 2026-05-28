'use client';

import TaxonomyListPage from '@/components/taxonomy/TaxonomyListPage';
import { Materials } from '@/lib/taxonomy-api';
import type { Material } from '@/types/taxonomy';

export default function MaterialsPage() {
  return (
    <TaxonomyListPage<Material>
      title="Materials"
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'sort_order', label: 'Order', type: 'number' },
      ]}
      api={Materials}
    />
  );
}
