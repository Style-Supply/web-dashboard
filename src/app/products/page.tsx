'use client';

import { useState } from 'react';
import {
  bulkDelete,
  bulkStatus,
  duplicateProduct,
  deleteProduct,
  updateProduct,
} from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useProducts } from '@/context/ProductsContext';
import ProductFilters from '@/components/list/ProductFilters';
import ProductTable from '@/components/list/ProductTable';
import BulkActionBar from '@/components/list/BulkActionBar';
import Button from '@/components/ui/Button';

const PAGE_SIZE = 50;

type BusyAction = 'publishing' | 'unpublishing' | 'duplicating' | 'deleting' | null;

export default function ProductsPage(): React.ReactElement {
  const { showToast } = useToast();
  const { products, total, query, loading, error, setQuery, refresh } = useProducts();
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<false | 'delete' | 'draft' | 'published'>(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
    showToast('success', 'List refreshed');
  }

  async function handleDuplicate(id: string): Promise<void> {
    setRowBusy(id);
    setBusyAction('duplicating');
    try {
      await duplicateProduct(id, true);
      await refresh();
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
      await refresh();
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
      await refresh();
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
      await refresh();
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
      await refresh();
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
      await refresh();
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
        <button
          onClick={() => void handleRefresh()}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-600 hover:text-[#7A021D] hover:bg-[#FDF8F4] rounded-lg transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
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
