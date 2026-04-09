'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Product, ProductListQuery } from '@/types/product';
import {
  listProducts,
  bulkDelete,
  bulkStatus,
  duplicateProduct,
  deleteProduct,
  updateProduct,
} from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import ProductFilters from '@/components/list/ProductFilters';
import ProductTable from '@/components/list/ProductTable';
import BulkActionBar from '@/components/list/BulkActionBar';
import Button from '@/components/ui/Button';

const PAGE_SIZE = 50;

type BusyAction = 'publishing' | 'unpublishing' | 'duplicating' | 'deleting' | null;

export default function ProductsPage(): React.ReactElement {
  const { showToast } = useToast();
  const [query, setQuery] = useState<ProductListQuery>({ limit: PAGE_SIZE, offset: 0, sort: '-created_at' });
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<false | 'delete' | 'draft' | 'published'>(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProducts(query);
      setProducts(res.products);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDuplicate(id: string): Promise<void> {
    setRowBusy(id);
    setBusyAction('duplicating');
    try {
      await duplicateProduct(id, true);
      await load();
      showToast('success', 'Product duplicated successfully');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to duplicate product');
    } finally {
      setRowBusy(null);
      setBusyAction(null);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('Delete this product?')) return;
    setRowBusy(id);
    setBusyAction('deleting');
    try {
      await deleteProduct(id);
      await load();
      showToast('success', 'Product deleted successfully');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to delete product');
    } finally {
      setRowBusy(null);
      setBusyAction(null);
    }
  }

  async function handlePublish(id: string): Promise<void> {
    setRowBusy(id);
    setBusyAction('publishing');
    try {
      await updateProduct(id, { status: 'published' });
      await load();
      showToast('success', 'Product published successfully');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to publish product');
    } finally {
      setRowBusy(null);
      setBusyAction(null);
    }
  }

  async function handleUnpublish(id: string): Promise<void> {
    setRowBusy(id);
    setBusyAction('unpublishing');
    try {
      await updateProduct(id, { status: 'draft' });
      await load();
      showToast('success', 'Product converted to draft');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to convert to draft');
    } finally {
      setRowBusy(null);
      setBusyAction(null);
    }
  }

  async function handleBulkDelete(): Promise<void> {
    if (!confirm(`Delete ${selection.size} products?`)) return;
    setBulkBusy('delete');
    try {
      const count = selection.size;
      await bulkDelete(Array.from(selection));
      setSelection(new Set());
      await load();
      showToast('success', `${count} product${count > 1 ? 's' : ''} deleted`);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Bulk delete failed');
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkStatus(status: 'draft' | 'published'): Promise<void> {
    setBulkBusy(status);
    try {
      const count = selection.size;
      await bulkStatus(Array.from(selection), status);
      setSelection(new Set());
      await load();
      showToast('success', `${count} product${count > 1 ? 's' : ''} ${status === 'published' ? 'published' : 'set to draft'}`);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Bulk update failed');
    } finally {
      setBulkBusy(false);
    }
  }

  const offset = query.offset ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
      </div>
      <div className="mb-4">
        <ProductFilters query={query} onChange={setQuery} />
      </div>
      <div className="mb-3">
        <BulkActionBar
          selectedIds={Array.from(selection)}
          products={products}
          busy={bulkBusy}
          onDelete={() => void handleBulkDelete()}
          onStatusChange={(s) => void handleBulkStatus(s)}
        />
      </div>
      {error && <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <ProductTable
          products={products}
          selection={selection}
          rowBusy={rowBusy}
          busyAction={busyAction}
          onSelectionChange={setSelection}
          onDuplicate={(id) => void handleDuplicate(id)}
          onDelete={(id) => void handleDelete(id)}
          onPublish={(id) => void handlePublish(id)}
          onUnpublish={(id) => void handleUnpublish(id)}
        />
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
        <div>
          {loading ? 'Loading…' : `${total} products`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setQuery((q) => ({ ...q, offset: Math.max(0, (q.offset ?? 0) - PAGE_SIZE) }))}
          >
            Prev
          </Button>
          <span>
            Page {page} of {pageCount}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setQuery((q) => ({ ...q, offset: (q.offset ?? 0) + PAGE_SIZE }))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
