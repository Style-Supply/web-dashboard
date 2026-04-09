'use client';

import type { Product } from '@/types/product';
import Button from '@/components/ui/Button';

interface BulkActionBarProps {
  selectedIds: string[];
  products: Product[];
  busy?: false | 'delete' | 'draft' | 'published';
  onDelete: () => void;
  onStatusChange: (status: 'draft' | 'published') => void;
}

function selectedToCsv(products: Product[], ids: Set<string>): string {
  const header = ['id', 'name', 'brand', 'retail_price_minor', 'status'];
  const lines = [header.join(',')];
  for (const p of products) {
    if (!ids.has(p.id)) continue;
    lines.push(
      [p.id, JSON.stringify(p.name), p.brand ?? '', p.retail_price_minor, p.status].join(','),
    );
  }
  return lines.join('\n');
}

export default function BulkActionBar({
  selectedIds,
  products,
  busy = false,
  onDelete,
  onStatusChange,
}: BulkActionBarProps): React.ReactElement | null {
  if (selectedIds.length === 0) return null;

  function exportCsv(): void {
    const csv = selectedToCsv(products, new Set(selectedIds));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-3 rounded bg-[color:var(--color-ink)] px-4 py-2 text-white">
      <span className="text-sm">{selectedIds.length} selected</span>
      <Button variant="secondary" size="sm" loading={busy === 'draft'} disabled={!!busy} onClick={() => onStatusChange('draft')}>
        Mark draft
      </Button>
      <Button variant="secondary" size="sm" loading={busy === 'published'} disabled={!!busy} onClick={() => onStatusChange('published')}>
        Mark published
      </Button>
      <Button variant="secondary" size="sm" disabled={!!busy} onClick={exportCsv}>
        Export CSV
      </Button>
      <Button variant="primary" size="sm" loading={busy === 'delete'} disabled={!!busy} onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}
