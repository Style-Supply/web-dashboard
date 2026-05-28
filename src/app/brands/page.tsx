'use client';

import TaxonomyListPage from '@/components/taxonomy/TaxonomyListPage';
import { Brands } from '@/lib/taxonomy-api';
import type { Brand } from '@/types/taxonomy';

export default function BrandsPage() {
  return (
    <TaxonomyListPage<Brand>
      title="Brands"
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'logo_url', label: 'Logo URL' },
        { key: 'description', label: 'Description' },
        { key: 'sort_order', label: 'Order', type: 'number' },
      ]}
      api={Brands}
    />
  );
}
