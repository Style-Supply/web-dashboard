'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Product, ProductImage } from '@/types/product';
import { getProductWithRetry, deleteProduct } from '@/lib/api';
import { useProductFormState } from '@/hooks/useProductFormState';
import { useProducts } from '@/context/ProductsContext';
import { useToast } from '@/components/ui/Toast';
import ProductForm from '@/components/product-form/ProductForm';

type Mode = 'add' | 'edit';

interface ProductDrawerProps {
  open: boolean;
  mode: Mode;
  productId: string | null; // null when mode === 'add'
  onClose: () => void;
}

export default function ProductDrawer({
  open,
  mode,
  productId,
  onClose,
}: ProductDrawerProps): React.ReactElement | null {
  const { showToast } = useToast();
  const { invalidate } = useProducts();
  const form = useProductFormState();
  const { set } = form;
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load product data when editing
  useEffect(() => {
    if (!open) return;
    if (mode === 'add' || !productId) {
      // Reset form for new product
      set({
        name: '', sku: null, brand_id: null, category_id: null,
        subcategory_id: null, sub_subcategory_id: null, material_id: null,
        fabric_details: null, description: null, retail_price_minor: 0,
        rent_price_minor: null, currency: 'INR', is_rentable: true, is_buyable: true, size_chart_url: null, status: 'draft',
        variants: [{ size: 'M', colour_id: null, custom_colour: null, quantity: 0, location_id: null, sku: null }],
        look_ids: [],
      });
      setImages([]);
      setLoadError(null);
      return;
    }

    // Edit mode: fetch product
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    getProductWithRetry(productId)
      .then((p) => {
        if (cancelled) return;
        set({
          name: p.name,
          sku: p.sku,
          brand_id: p.brand_id,
          category_id: p.category_id,
          subcategory_id: p.subcategory_id,
          sub_subcategory_id: p.sub_subcategory_id,
          material_id: p.material_id,
          fabric_details: p.fabric_details,
          description: p.description,
          retail_price_minor: p.retail_price_minor,
          rent_price_minor: p.rent_price_minor,
          currency: p.currency,
          is_rentable: p.is_rentable ?? true,
          is_buyable: p.is_buyable ?? true,
          size_chart_url: p.size_chart_url ?? null,
          status: p.status,
          variants: p.variants.map((v) => ({
            id: v.id,
            size: v.size,
            colour_id: v.colour?.id ?? null,
            custom_colour: v.custom_colour,
            quantity: v.quantity,
            location_id: v.location?.id ?? null,
            sku: v.sku ?? null,
          })),
          look_ids: p.looks.map((l) => l.id),
        });
        setImages(p.images);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load product');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, mode, productId, set]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function handleDelete(): Promise<void> {
    if (!productId) return;
    setDeleting(true);
    try {
      await deleteProduct(productId);
      invalidate();
      showToast('success', 'Product deleted');
      onClose();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const handleClose = useCallback(() => {
    setShowDeleteConfirm(false);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col bg-white shadow-2xl"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-[#2C0505] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              {mode === 'add' ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {mode === 'add' ? 'Add New Product' : 'Edit Product'}
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                {mode === 'add' ? 'Fill in the details below' : 'Update product details'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'edit' && productId && !showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 hover:text-red-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
            {showDeleteConfirm && (
              <div className="flex items-center gap-2 rounded-lg bg-red-900/40 px-3 py-1.5">
                <span className="text-xs text-red-200">Confirm delete?</span>
                <button
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="rounded px-2 py-0.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs text-white/50 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7A021D] border-t-transparent" />
                <p className="text-sm text-neutral-500">Loading product…</p>
              </div>
            </div>
          ) : loadError ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 max-w-sm text-center">
                {loadError}
              </div>
            </div>
          ) : (
            <ProductForm
              form={form}
              productId={mode === 'edit' ? productId : null}
              images={images}
              onImagesChange={setImages}
              onSaveSuccess={handleClose}
            />
          )}
        </div>
      </div>

      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      ` }} />
    </>
  );
}
