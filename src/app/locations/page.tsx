'use client';

import TaxonomyListPage from '@/components/taxonomy/TaxonomyListPage';
import { Locations } from '@/lib/taxonomy-api';
import type { LocationT } from '@/types/taxonomy';

export default function LocationsPage() {
  return (
    <TaxonomyListPage<LocationT>
      title="Locations"
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'sort_order', label: 'Order', type: 'number' },
      ]}
      api={Locations}
    />
  );
}
