'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Collections, Looks } from '@/lib/taxonomy-api';
import { useToast } from '@/components/ui/Toast';
import { invalidateTaxonomyCache } from '@/hooks/useTaxonomy';
import { supabase } from '@/lib/supabase';
import { API_BASE, ApiError, request } from '@/lib/api';
import type { Collection, Look, LookProduct } from '@/types/taxonomy';
import type { Product, ProductListResponse } from '@/types/product';

/* ─── upload helper for collection hero ──────────────────── */
async function uploadCollectionHero(file: File): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/admin/collections/image-upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new ApiError(body?.error?.message ?? res.statusText, res.status, body?.error?.code ?? null);
  }
  const result = await res.json() as { url: string };
  return result.url;
}

/* ─── Hero Image Uploader Component ──────────────────────── */
interface HeroUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

function HeroUploader({ value, onChange }: HeroUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select an image file');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showToast('error', 'Image must be smaller than 4 MB');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCollectionHero(file);
      onChange(url);
      showToast('success', 'Hero image uploaded');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-neutral-500">Cover / Hero Image</label>

      {value ? (
        <div className="relative group rounded-xl border border-neutral-200 bg-white p-2 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Hero cover"
            className="h-28 w-full rounded-lg object-cover"
            onError={(e) => { e.currentTarget.src = ''; }}
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FDF8F4] border border-[#7A021D]/20 px-3 py-1 text-xs font-medium text-[#7A021D] hover:bg-[#f5e8e8] transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Replace Cover'}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-6 transition-all cursor-pointer ${
            dragOver
              ? 'border-[#7A021D] bg-[#FDF8F4] scale-[1.01]'
              : 'border-neutral-200 bg-neutral-50 hover:border-[#7A021D]/40 hover:bg-[#FDF8F4]/50'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#7A021D] border-t-transparent" />
              <p className="text-xs font-medium text-[#7A021D]">Uploading cover…</p>
            </div>
          ) : (
            <>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100">
                <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-neutral-600">
                {dragOver ? 'Drop cover image here' : 'Click or drag cover image'}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-400">PNG, JPG, WEBP, GIF · max 4 MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/* ─── Icons ────────────────────────────────────────────────── */
function IconGrid({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-[#7A021D]' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={1.8} />
    </svg>
  );
}

function IconList({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-[#7A021D]' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

const GRADIENTS = [
  'from-amber-700 via-rose-900 to-[#2C0505]',
  'from-purple-900 via-indigo-900 to-[#2C0505]',
  'from-teal-800 via-emerald-950 to-[#2C0505]',
  'from-rose-800 via-pink-950 to-[#2C0505]',
  'from-amber-800 via-yellow-950 to-[#2C0505]',
];

function collectionGradient(id: string): string {
  const idx = id.charCodeAt(0) % GRADIENTS.length;
  return GRADIENTS[idx];
}

/* ─── Collection Slide-Over Drawer ─────────────────────────── */
const EMPTY_COLLECTION: Partial<Collection> = {
  name: '',
  slug: '',
  description: null,
  hero_url: null,
  tile_variant: 'light',
  sort_order: 0,
};

interface CollectionModalProps {
  collection: Partial<Collection> | null;
  isNew: boolean;
  onChange: (patch: Partial<Collection>) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
  saving: boolean;
  deleting: boolean;
  showDeleteConfirm: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
}

function CollectionDrawer({
  collection,
  isNew,
  onChange,
  onSave,
  onDelete,
  onClose,
  saving,
  deleting,
  showDeleteConfirm,
  onRequestDelete,
  onCancelDelete,
}: CollectionModalProps) {
  if (!collection) return null;

  function field(key: keyof Collection) {
    return (collection as Record<string, unknown>)[key] as string ?? '';
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
        style={{ animation: 'slideInRight .22s ease-out' }}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-[#2C0505] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              {isNew ? (
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
              <h2 className="text-sm font-semibold text-white">
                {isNew ? 'Add Collection' : 'Edit Collection'}
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                {isNew ? 'Create a new collection' : field('name')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && !showDeleteConfirm && (
              <button
                onClick={onRequestDelete}
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
                <span className="text-xs text-red-200">Delete collection?</span>
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="rounded px-2 py-0.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Yes'}
                </button>
                <button onClick={onCancelDelete} className="text-xs text-white/50 hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* form body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              value={field('name')}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
              placeholder="e.g. Summer Riviera 2026"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Slug</label>
            <input
              value={field('slug')}
              onChange={(e) => onChange({ slug: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
              placeholder="e.g. summer-riviera-2026"
            />
          </div>

          <HeroUploader
            value={(collection as Collection).hero_url ?? null}
            onChange={(url) => onChange({ hero_url: url })}
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Description</label>
            <textarea
              rows={3}
              value={field('description')}
              onChange={(e) => onChange({ description: e.target.value || null })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all resize-none"
              placeholder="Collection story or description…"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-500">Tile Style</label>
            <div className="grid grid-cols-3 gap-2">
              {(['image', 'light', 'featured'] as Collection['tile_variant'][]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange({ tile_variant: v })}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-medium capitalize transition-all ${
                    (collection as Collection).tile_variant === v
                      ? 'border-[#7A021D] bg-[#FDF8F4] text-[#7A021D]'
                      : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Sort Order</label>
            <input
              type="number"
              value={(collection as Collection).sort_order ?? 0}
              onChange={(e) => onChange({ sort_order: Number(e.target.value) })}
              className="w-32 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
            />
          </div>
        </div>

        {/* footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-neutral-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !((collection as Collection).name?.trim())}
            className="flex items-center gap-2 rounded-lg bg-[#7A021D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : isNew ? 'Add Collection' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Look Editor Modal ─────────────────────────────────────── */
interface LookEditorModalProps {
  look: Look;
  onClose: () => void;
  onLookUpdated: () => Promise<void>;
}

function LookEditorModal({ look, onClose, onLookUpdated }: LookEditorModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Look info state
  const [name, setName] = useState(look.name);
  const [description, setDescription] = useState(look.description ?? '');
  const [heroUrl, setHeroUrl] = useState<string | null>(look.hero_url);
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Attached products state
  const [products, setProducts] = useState<LookProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Catalog search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [updatingVariantProductId, setUpdatingVariantProductId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await Looks.getProducts(look.id);
      setProducts(res.items ?? []);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load look products');
    } finally {
      setLoadingProducts(false);
    }
  }, [look.id]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await request<ProductListResponse>(`/api/admin/products?q=${encodeURIComponent(searchQuery)}&limit=8`);
        const items = res.items ?? [];
        setSearchResults(items);
        setSelectedVariants((prev) => {
          const next = { ...prev };
          for (const item of items) {
            if (!next[item.id] && item.variants && item.variants.length > 0) {
              next[item.id] = item.variants[0].id;
            }
          }
          return next;
        });
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Save Name & Description
  async function handleSaveDetails() {
    if (!name.trim()) {
      showToast('error', 'Look name is required');
      return;
    }
    setSavingDetails(true);
    try {
      await Looks.update(look.id, {
        name: name.trim(),
        description: description.trim() || null,
        hero_url: heroUrl,
      });
      showToast('success', 'Look details saved');
      await onLookUpdated();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update look');
    } finally {
      setSavingDetails(false);
    }
  }

  // Upload image
  async function handleImageFile(file: File) {
    setUploadingImage(true);
    try {
      const url = await Looks.uploadImage(file);
      setHeroUrl(url);
      await Looks.update(look.id, { hero_url: url });
      showToast('success', 'Look image updated');
      await onLookUpdated();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  }

  // Remove image
  async function handleRemoveImage() {
    if (!confirm('Remove image from this look?')) return;
    setHeroUrl(null);
    try {
      await Looks.update(look.id, { hero_url: null });
      showToast('success', 'Look image removed');
      await onLookUpdated();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove image');
    }
  }

  // Add product with selected variant
  async function handleAddProduct(p: Product) {
    setAddingProductId(p.id);
    const chosenVariantId = selectedVariants[p.id] || p.variants?.[0]?.id || null;
    try {
      await Looks.addProduct(look.id, p.id, chosenVariantId);
      showToast('success', `Added "${p.name}" to look`);
      await loadProducts();
      await onLookUpdated();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setAddingProductId(null);
    }
  }

  // Update variant for product already in look
  async function handleUpdateVariant(productId: string, variantId: string) {
    setUpdatingVariantProductId(productId);
    try {
      await Looks.updateProductVariant(look.id, productId, variantId || null);
      showToast('success', 'Look product variant updated');
      await loadProducts();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update variant');
    } finally {
      setUpdatingVariantProductId(null);
    }
  }

  // Remove product
  async function handleRemoveProduct(productId: string) {
    try {
      await Looks.removeProduct(look.id, productId);
      showToast('success', 'Product removed from look');
      await loadProducts();
      await onLookUpdated();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove product');
    }
  }

  const attachedIds = new Set(products.map((p) => p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-neutral-100 flex flex-col max-h-[92vh] overflow-hidden my-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-[#FAF8F5] px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A021D]/10 text-[#7A021D] text-lg font-bold">
              ✦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#2C0505]">Edit Look: {name || 'Untitled'}</h2>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-mono text-neutral-600">
                  #{look.id.slice(0, 8)}
                </span>
              </div>
              <p className="text-xs text-neutral-500">Configure look hero photo and attach curated outfit pieces</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column: Image & Details */}
            <div className="space-y-6">
              
              {/* Card 1: Look Hero Image */}
              <div className="rounded-xl border border-neutral-200/80 bg-[#FCFAF8] p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C0505] flex items-center gap-1.5">
                    <span>📸</span> Look Image / Editorial Shot
                  </h3>
                  {heroUrl && (
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImageFile(f);
                    e.target.value = '';
                  }}
                />

                {heroUrl ? (
                  <div className="space-y-3">
                    <div className="relative aspect-[3/4] max-h-72 w-full rounded-xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-100 flex items-center justify-center">
                      <img src={heroUrl} alt={name} className="h-full w-full object-cover object-top" />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white gap-2">
                          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span className="text-xs font-medium">Uploading new image…</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex-1 rounded-lg border border-neutral-200 bg-white py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        Replace Image
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemoveImage()}
                        disabled={uploadingImage}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete image"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !uploadingImage && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#7A021D] hover:bg-[#FFF5F7] transition-all group"
                  >
                    {uploadingImage ? (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#7A021D] border-t-transparent" />
                        <span className="text-xs font-semibold text-[#7A021D]">Uploading photo…</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:bg-[#7A021D]/10 group-hover:text-[#7A021D] transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-xs font-semibold text-neutral-700">Click to upload Look image</p>
                        <p className="text-[11px] text-neutral-400">PNG, JPG, or WEBP up to 4MB</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 2: Look Details */}
              <div className="rounded-xl border border-neutral-200/80 bg-[#FCFAF8] p-4 space-y-3.5">
                <div className="border-b border-neutral-200/60 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2C0505] flex items-center gap-1.5">
                    <span>✏️</span> Look Information
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Look Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. City Chic"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#7A021D]/20 focus:border-[#7A021D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Editorial Caption / Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional styling notes or editorial quote..."
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#7A021D]/20 focus:border-[#7A021D]"
                  />
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => void handleSaveDetails()}
                    disabled={savingDetails || !name.trim()}
                    className="rounded-xl bg-[#7A021D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#600117] transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {savingDetails ? 'Saving…' : 'Save Details'}
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Products in this Look */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#2C0505]">Products in Look</h3>
                  <p className="text-[11px] text-neutral-400">Curate the complete outfit shown in this look</p>
                </div>
                <span className="rounded-full bg-[#7A021D]/10 px-2.5 py-0.5 text-xs font-bold text-[#7A021D]">
                  {products.length} {products.length === 1 ? 'product' : 'products'}
                </span>
              </div>

              {/* Products List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {loadingProducts ? (
                  <div className="p-6 text-center text-xs text-neutral-400">Loading products…</div>
                ) : products.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-xs text-neutral-400">
                    No products added to this look yet. Use the search below to attach items.
                  </div>
                ) : (
                  products.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-neutral-200/80 bg-white hover:border-neutral-300 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" className="h-12 w-10 rounded-lg object-cover flex-shrink-0 border border-neutral-100 shadow-2xs" />
                        ) : (
                          <div className="h-12 w-10 rounded-lg bg-neutral-100 flex items-center justify-center text-[9px] text-neutral-400 flex-shrink-0">No IMG</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 truncate">
                            {p.brand?.name ?? '—'}
                          </p>
                          <p className="text-xs font-semibold text-[#2C0505] truncate">{p.name}</p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {p.rent_price_minor ? `Rent: ₹${Math.round(p.rent_price_minor / 100)}` : 'Rentable'}
                            {p.retail_price_minor ? ` · MRP: ₹${Math.round(p.retail_price_minor / 100)}` : ''}
                          </p>

                          {/* Variant Selector / Badge */}
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            {p.all_variants && p.all_variants.length > 1 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A021D] bg-[#FDF8F4] px-1.5 py-0.5 rounded border border-[#7A021D]/20">
                                  Variant:
                                </span>
                                <select
                                  value={p.variant_id ?? p.variant?.id ?? p.all_variants[0]?.id}
                                  onChange={(e) => void handleUpdateVariant(p.id, e.target.value)}
                                  disabled={updatingVariantProductId === p.id}
                                  className="rounded-lg border border-neutral-200 bg-neutral-50/90 px-2 py-0.5 text-[11px] font-medium text-neutral-800 hover:bg-white focus:outline-none focus:ring-1 focus:ring-[#7A021D] transition-all disabled:opacity-50"
                                >
                                  {p.all_variants.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      Size: {v.size} {v.sku ? `(${v.sku})` : ''} {v.quantity !== undefined && v.quantity <= 0 ? '· Out of stock' : ''}
                                    </option>
                                  ))}
                                </select>
                                {updatingVariantProductId === p.id && (
                                  <span className="h-3 w-3 animate-spin rounded-full border border-[#7A021D] border-t-transparent" />
                                )}
                              </div>
                            ) : p.variant ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#FDF8F4] border border-[#7A021D]/20 px-2 py-0.5 text-[10px] font-semibold text-[#7A021D]">
                                <span>Size: {p.variant.size}</span>
                                {p.variant.sku && <span className="font-mono text-neutral-400">· {p.variant.sku}</span>}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleRemoveProduct(p.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                        title="Remove product from look"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Products Section */}
              <div className="rounded-xl border border-neutral-200 bg-[#FCFAF8] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D] flex items-center gap-1.5">
                    <span>🔍</span> Add Products to Look
                  </label>
                  {searching && <span className="text-[11px] text-[#7A021D] animate-pulse">Searching…</span>}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by product name or SKU…"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#7A021D]/20 focus:border-[#7A021D]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white shadow-sm [scrollbar-width:none]">
                    {searchResults.map((p) => {
                      const isAttached = attachedIds.has(p.id);
                      const isAdding = addingProductId === p.id;
                      const thumb = p.images?.[0]?.public_url ?? null;
                      const variants = p.variants || [];
                      const selectedVarId = selectedVariants[p.id] || variants[0]?.id || '';

                      return (
                        <div key={p.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-[#FDF8F4] transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {thumb ? (
                              <img src={thumb} alt="" className="h-10 w-8 rounded object-cover flex-shrink-0 border border-neutral-100" />
                            ) : (
                              <div className="h-10 w-8 rounded bg-neutral-100 flex items-center justify-center text-[8px] flex-shrink-0">IMG</div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[#2C0505] truncate">{p.name}</p>
                              <p className="text-[10px] text-neutral-400">{p.brand?.name ?? '—'}</p>
                              
                              {/* Variant Selection Option */}
                              {variants.length > 1 ? (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="text-[10px] font-medium text-neutral-500">Variant:</span>
                                  <select
                                    value={selectedVarId}
                                    onChange={(e) => setSelectedVariants((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                    disabled={isAttached || isAdding}
                                    className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-neutral-700 hover:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#7A021D] disabled:opacity-50"
                                  >
                                    {variants.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        Size: {v.size} {v.sku ? `(${v.sku})` : ''} {v.quantity <= 0 ? '· Out of stock' : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : variants.length === 1 ? (
                                <div className="mt-0.5 text-[10px] text-neutral-500 font-medium">
                                  <span className="rounded bg-neutral-100 px-1.5 py-0.2">Size: {variants[0].size}</span>
                                  {variants[0].sku && <span className="ml-1 font-mono text-neutral-400">({variants[0].sku})</span>}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleAddProduct(p)}
                            disabled={isAttached || isAdding}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                              isAttached
                                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                : 'bg-[#7A021D] text-white hover:bg-[#600117] shadow-2xs'
                            }`}
                          >
                            {isAttached ? '✓ Added' : isAdding ? 'Adding…' : '+ Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 bg-[#FAF8F5] px-6 py-3 flex-shrink-0">
          <p className="text-xs text-neutral-400">All look changes and attached products are saved automatically.</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#2C0505] px-5 py-2 text-xs font-semibold text-white hover:bg-black transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

/* ─── Manage Looks Drawer ──────────────────────────────────── */
interface ManageLooksDrawerProps {
  collection: Collection | null;
  looks: Look[];
  onClose: () => void;
  onAddLook: (name: string) => Promise<void>;
  onDeleteLook: (lookId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

function ManageLooksDrawer({
  collection,
  looks,
  onClose,
  onAddLook,
  onDeleteLook,
  onRefresh,
}: ManageLooksDrawerProps) {
  const [newLookName, setNewLookName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingLook, setEditingLook] = useState<Look | null>(null);

  if (!collection) return null;

  async function handleAdd() {
    if (!newLookName.trim()) return;
    setAdding(true);
    try {
      await onAddLook(newLookName.trim());
      setNewLookName('');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(lookId: string) {
    if (!confirm('Are you sure you want to delete this look? Any attached products will be unlinked.')) return;
    setDeletingId(lookId);
    try {
      await onDeleteLook(lookId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl"
        style={{ animation: 'slideInRight .22s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-[#2C0505] px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white font-bold">
              ✦
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Looks in {collection.name}</h2>
              <p className="text-xs text-white/50 mt-0.5">{looks.length} look{looks.length !== 1 ? 's' : ''} configured</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Add Look */}
          <div className="rounded-xl border border-neutral-200 bg-[#FDF8F4] p-4 space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#7A021D]">
              Add New Look
            </label>
            <div className="flex gap-2">
              <input
                value={newLookName}
                onChange={(e) => setNewLookName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
                placeholder="Look name (e.g. Look 01 - Sunset)"
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D]"
              />
              <button
                onClick={() => void handleAdd()}
                disabled={adding || !newLookName.trim()}
                className="rounded-lg bg-[#7A021D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-colors shrink-0"
              >
                {adding ? 'Adding…' : 'Add Look'}
              </button>
            </div>
          </div>

          {/* Looks List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Existing Looks ({looks.length})
              </h3>
              <span className="text-[11px] text-neutral-400">Click a look to manage photo & products</span>
            </div>

            {looks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
                <p className="text-xs font-medium text-neutral-500">No looks added yet</p>
                <p className="mt-1 text-[11px] text-neutral-400">Type a name above to add a look</p>
              </div>
            ) : (
              <div className="space-y-3">
                {looks.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-xs hover:border-neutral-300 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {l.hero_url ? (
                        <img src={l.hero_url} alt="" className="h-14 w-11 rounded-lg object-cover flex-shrink-0 border border-neutral-200 shadow-2xs" />
                      ) : (
                        <div className="h-14 w-11 rounded-lg bg-neutral-100 flex flex-col items-center justify-center text-[9px] text-neutral-400 flex-shrink-0 border border-neutral-200/60">
                          <span>📸</span>
                          <span>No IMG</span>
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[#2C0505] truncate">{l.name}</p>
                          <span className="rounded-full bg-[#7A021D]/10 px-2 py-0.5 text-[10px] font-bold text-[#7A021D] shrink-0">
                            {l.product_count ?? 0} {l.product_count === 1 ? 'product' : 'products'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-neutral-400 truncate mt-0.5">/{l.slug}</p>
                        {l.description && (
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5">{l.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingLook(l)}
                        className="rounded-lg bg-neutral-100 hover:bg-[#7A021D] hover:text-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors flex items-center gap-1"
                      >
                        <span>✏️</span> Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(l.id)}
                        disabled={deletingId === l.id}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete look"
                      >
                        {deletingId === l.id ? (
                          <span className="h-4 w-4 block animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-300 transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Look Editor Modal */}
      {editingLook && (
        <LookEditorModal
          look={editingLook}
          onClose={() => setEditingLook(null)}
          onLookUpdated={async () => {
            await onRefresh();
            // Refresh local editingLook object
            try {
              const fresh = await Looks.listFor(collection.id);
              const updated = fresh.items.find((x) => x.id === editingLook.id);
              if (updated) setEditingLook(updated);
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}
    </>
  );
}

/* ─── Main Collections Page ─────────────────────────────────── */
export default function CollectionsPage() {
  const { showToast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');

  // Drawer / Modal state
  const [draft, setDraft] = useState<Partial<Collection>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Manage Looks Drawer state
  const [managingLooksCol, setManagingLooksCol] = useState<Collection | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await Collections.list(q || undefined);
      setCollections(items);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { void load(); }, [load]);

  function openAdd() {
    setEditingId(null);
    setDraft({ ...EMPTY_COLLECTION });
    setShowDeleteConfirm(false);
    setIsOpen(true);
  }

  function openEdit(col: Collection) {
    setEditingId(col.id);
    setDraft({ ...col });
    setShowDeleteConfirm(false);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setShowDeleteConfirm(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await Collections.update(editingId, draft);
      } else {
        await Collections.create(draft);
      }
      invalidateTaxonomyCache();
      await load();
      closeModal();
      showToast('success', editingId ? 'Collection updated' : 'Collection created');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    setDeleting(true);
    try {
      await Collections.remove(editingId);
      invalidateTaxonomyCache();
      await load();
      closeModal();
      showToast('success', 'Collection deleted');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function openManagingLooks(col: Collection) {
    setManagingLooksCol(col);
    try {
      const fresh = await Looks.listFor(col.id);
      setManagingLooksCol((prev) => prev && prev.id === col.id ? { ...prev, looks: fresh.items } : prev);
    } catch (err) {
      console.error(err);
    }
  }

  // Looks handlers
  async function handleAddLook(collectionId: string, name: string) {
    try {
      await Looks.create({ collection_id: collectionId, name });
      invalidateTaxonomyCache();
      await load();
      const fresh = await Looks.listFor(collectionId);
      setManagingLooksCol((prev) => prev ? { ...prev, looks: fresh.items } : null);
      showToast('success', 'Look added');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to add look');
    }
  }

  async function handleDeleteLook(lookId: string) {
    try {
      await Looks.remove(lookId);
      invalidateTaxonomyCache();
      await load();
      if (managingLooksCol) {
        const fresh = await Looks.listFor(managingLooksCol.id);
        setManagingLooksCol((prev) => prev ? { ...prev, looks: fresh.items } : null);
      }
      showToast('success', 'Look removed');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to delete look');
    }
  }

  return (
    <>
      <div className="min-h-full bg-neutral-50 p-6">
        {/* ── Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2C0505]">Collections</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {loading ? 'Loading…' : `${collections.length} collection${collections.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Collection
          </button>
        </div>

        {/* ── Toolbar: Search + View Toggle ── */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search collections…"
              className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
            />
          </div>

          <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setView('grid')}
              title="Grid view"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                view === 'grid' ? 'bg-[#FDF8F4] shadow-sm' : 'hover:bg-neutral-50'
              }`}
            >
              <IconGrid active={view === 'grid'} />
            </button>
            <button
              onClick={() => setView('list')}
              title="List view"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                view === 'list' ? 'bg-[#FDF8F4] shadow-sm' : 'hover:bg-neutral-50'
              }`}
            >
              <IconList active={view === 'list'} />
            </button>
          </div>
        </div>

        {/* ── Skeleton Loading ── */}
        {loading && view === 'grid' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        )}
        {loading && view === 'list' && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Empty State ── */}
        {!loading && collections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
              <svg className="w-7 h-7 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-700">No collections found</p>
            <p className="mt-1 text-xs text-neutral-400">Add your first collection to organize products</p>
            <button
              onClick={openAdd}
              className="mt-4 flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Collection
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════
            GRID VIEW
        ══════════════════════════════════════ */}
        {!loading && collections.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((col) => {
              const gradientClass = collectionGradient(col.id);
              const looksCount = col.looks?.length ?? 0;

              return (
                <div
                  key={col.id}
                  className="group relative flex flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
                >
                  {/* Banner / Cover */}
                  <div className="relative h-36 w-full overflow-hidden bg-neutral-900">
                    {col.hero_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={col.hero_url}
                        alt={col.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${gradientClass} opacity-90 p-4 flex flex-col justify-end`}>
                        <span className="text-3xl font-black text-white/20 uppercase tracking-widest">
                          {col.name.slice(0, 3)}
                        </span>
                      </div>
                    )}

                    {/* Tile Variant Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        col.tile_variant === 'featured'
                          ? 'bg-amber-400 text-amber-950'
                          : col.tile_variant === 'image'
                          ? 'bg-blue-500 text-white'
                          : 'bg-black/40 text-white backdrop-blur-md'
                      }`}>
                        {col.tile_variant}
                      </span>
                    </div>

                    {/* Looks Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md flex items-center gap-1">
                        <span>✦</span> {looksCount} Look{looksCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-[#2C0505]">{col.name}</h3>
                        <p className="text-xs font-mono text-neutral-400 mt-0.5">{col.slug}</p>
                      </div>
                      <button
                        onClick={() => openEdit(col)}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-[#7A021D] transition-colors"
                        title="Edit Collection"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>

                    {col.description ? (
                      <p className="mt-2 line-clamp-2 text-xs text-neutral-500 leading-relaxed">
                        {col.description}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-neutral-300 italic">No description added</p>
                    )}

                    {/* Looks Chips */}
                    {col.looks && col.looks.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {col.looks.slice(0, 4).map((l) => (
                          <span
                            key={l.id}
                            className="rounded-md bg-[#FDF8F4] border border-[#7A021D]/15 px-2 py-0.5 text-[11px] font-medium text-[#7A021D]"
                          >
                            {l.name}
                          </span>
                        ))}
                        {col.looks.length > 4 && (
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                            +{col.looks.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
                      <button
                        onClick={() => void openManagingLooks(col)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#7A021D] hover:underline"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Manage Looks ({looksCount})
                      </button>

                      <button
                        onClick={() => openEdit(col)}
                        className="text-xs font-medium text-neutral-400 hover:text-neutral-700"
                      >
                        Edit Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════
            LIST VIEW
        ══════════════════════════════════════ */}
        {!loading && collections.length > 0 && view === 'list' && (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_6rem_6rem_7rem] items-center bg-[#FDF8F4] border-b border-neutral-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <span>Collection</span>
              <span>Slug</span>
              <span>Description</span>
              <span>Tile Style</span>
              <span>Looks</span>
              <span className="text-right">Actions</span>
            </div>

            {collections.map((col, idx) => {
              const looksCount = col.looks?.length ?? 0;
              return (
                <div
                  key={col.id}
                  className={`group grid grid-cols-[1fr_1fr_1fr_6rem_6rem_7rem] items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#FDF8F4]/50 ${
                    idx !== 0 ? 'border-t border-neutral-100' : ''
                  }`}
                >
                  {/* Collection Name & Cover */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-neutral-900 overflow-hidden flex items-center justify-center text-white font-bold text-xs">
                      {col.hero_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={col.hero_url}
                          alt={col.name}
                          className="h-full w-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span>{col.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="truncate text-sm font-semibold text-[#2C0505]">
                      {col.name}
                    </span>
                  </div>

                  {/* Slug */}
                  <span className="truncate text-xs font-mono text-neutral-400">
                    {col.slug}
                  </span>

                  {/* Description */}
                  <span className="truncate text-xs text-neutral-500">
                    {col.description || <span className="italic text-neutral-300">No description</span>}
                  </span>

                  {/* Tile Variant */}
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      col.tile_variant === 'featured'
                        ? 'bg-amber-100 text-amber-800'
                        : col.tile_variant === 'image'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {col.tile_variant}
                    </span>
                  </div>

                  {/* Looks Count */}
                  <div>
                    <button
                      onClick={() => void openManagingLooks(col)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#FDF8F4] px-2.5 py-1 text-xs font-semibold text-[#7A021D] hover:bg-[#f5e8e8] transition-colors"
                    >
                      <span>✦</span> {looksCount} Look{looksCount !== 1 ? 's' : ''}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(col)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-[#7A021D] transition-colors"
                      title="Edit Collection"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Slide-Over Collection Drawer ── */}
      <CollectionDrawer
        collection={isOpen ? draft : null}
        isNew={editingId === null}
        onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
        onClose={closeModal}
        saving={saving}
        deleting={deleting}
        showDeleteConfirm={showDeleteConfirm}
        onRequestDelete={() => setShowDeleteConfirm(true)}
        onCancelDelete={() => setShowDeleteConfirm(false)}
      />

      {/* ── Manage Looks Drawer ── */}
      <ManageLooksDrawer
        collection={managingLooksCol}
        looks={managingLooksCol?.looks ?? []}
        onClose={() => setManagingLooksCol(null)}
        onAddLook={(name) => handleAddLook(managingLooksCol!.id, name)}
        onDeleteLook={(lookId) => handleDeleteLook(lookId)}
        onRefresh={async () => {
          await load();
          if (managingLooksCol) {
            try {
              const fresh = await Looks.listFor(managingLooksCol.id);
              setManagingLooksCol((prev) => prev ? { ...prev, looks: fresh.items } : null);
            } catch (err) {
              console.error(err);
            }
          }
        }}
      />

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
