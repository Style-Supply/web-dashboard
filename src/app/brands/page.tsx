'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Brands } from '@/lib/taxonomy-api';
import { useToast } from '@/components/ui/Toast';
import { invalidateTaxonomyCache } from '@/hooks/useTaxonomy';
import { supabase } from '@/lib/supabase';
import { API_BASE, ApiError } from '@/lib/api';
import type { Brand } from '@/types/taxonomy';

/* ─── upload helper ───────────────────────────────────────── */
async function uploadBrandLogo(file: File): Promise<string> {
  // Get auth token from supabase session
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

  const formData = new FormData();
  formData.append('file', file);

  // Use raw fetch — do NOT set Content-Type, browser sets it with the multipart boundary
  const res = await fetch(`${API_BASE}/api/admin/brands/logo-upload`, {
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

/* ─── logo uploader component ─────────────────────────────── */
interface LogoUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

function LogoUploader({ value, onChange }: LogoUploaderProps) {
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
      const url = await uploadBrandLogo(file);
      onChange(url);
      showToast('success', 'Logo uploaded');
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
      <label className="mb-1.5 block text-xs font-medium text-neutral-500">Logo</label>

      {value ? (
        /* ── preview with remove/replace ── */
        <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="brand logo"
            className="h-14 w-14 rounded-lg object-contain border border-neutral-100 bg-neutral-50 p-1"
            onError={(e) => { e.currentTarget.src = ''; }}
          />
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FDF8F4] border border-[#7A021D]/20 px-3 py-1.5 text-xs font-medium text-[#7A021D] hover:bg-[#f5e8e8] transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <><span className="h-3 w-3 animate-spin rounded-full border-2 border-[#7A021D] border-t-transparent" /> Uploading…</>
              ) : (
                <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Replace</>
              )}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Remove
            </button>
          </div>
        </div>
      ) : (
        /* ── drop zone ── */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 transition-all cursor-pointer ${
            dragOver
              ? 'border-[#7A021D] bg-[#FDF8F4] scale-[1.01]'
              : 'border-neutral-200 bg-neutral-50 hover:border-[#7A021D]/40 hover:bg-[#FDF8F4]/50'
          }`}
        >
          {uploading ? (
            <>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF8F4]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#7A021D] border-t-transparent" />
              </div>
              <p className="text-xs font-medium text-[#7A021D]">Uploading…</p>
            </>
          ) : (
            <>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-neutral-600">
                {dragOver ? 'Drop image here' : 'Click or drag to upload logo'}
              </p>
              <p className="mt-1 text-[11px] text-neutral-400">PNG, JPG, WEBP, GIF · max 4 MB</p>
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

/* ─── helpers ─────────────────────────────────────────────── */

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const PALETTE: [string, string][] = [
  ['#7A021D', '#FDF1F3'],
  ['#2C0505', '#FFF4F6'],
  ['#B45309', '#FEF3C7'],
  ['#065F46', '#ECFDF5'],
  ['#1E40AF', '#EFF6FF'],
  ['#6B21A8', '#F5F3FF'],
  ['#0F766E', '#F0FDFA'],
  ['#9D174D', '#FDF2F8'],
];

function brandColor(id: string): [string, string] {
  const idx = id.charCodeAt(0) % PALETTE.length;
  return PALETTE[idx];
}

/* ─── empty draft ──────────────────────────────────────────── */
const EMPTY: Partial<Brand> = {
  name: '',
  slug: '',
  logo_url: null,
  description: null,
  sort_order: 0,
  tile_variant: 'light',
};

/* ─── view toggle icons ────────────────────────────────────── */
function IconGrid({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-[#7A021D]' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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

/* ─── brand modal / drawer ─────────────────────────────────── */
interface ModalProps {
  brand: Partial<Brand> | null;
  isNew: boolean;
  onChange: (patch: Partial<Brand>) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
  saving: boolean;
  deleting: boolean;
  showDeleteConfirm: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
}

function BrandModal({
  brand,
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
}: ModalProps) {
  if (!brand) return null;

  function field(key: keyof Brand) {
    return (brand as Record<string, unknown>)[key] as string ?? '';
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
                {isNew ? 'Add Brand' : 'Edit Brand'}
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                {isNew ? 'Create a new brand entry' : field('name')}
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
                <span className="text-xs text-red-200">Delete brand?</span>
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
              placeholder="e.g. Label Miloni"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Slug</label>
            <input
              value={field('slug')}
              onChange={(e) => onChange({ slug: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
              placeholder="e.g. label-miloni"
            />
          </div>

          <LogoUploader
            value={(brand as Brand).logo_url ?? null}
            onChange={(url) => onChange({ logo_url: url })}
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Description</label>
            <textarea
              rows={3}
              value={field('description')}
              onChange={(e) => onChange({ description: e.target.value || null })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all resize-none"
              placeholder="Short description of the brand…"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-500">Tile Style</label>
            <div className="grid grid-cols-3 gap-2">
              {(['image', 'light', 'logo'] as Brand['tile_variant'][]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange({ tile_variant: v })}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-medium capitalize transition-all ${
                    (brand as Brand).tile_variant === v
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
              value={(brand as Brand).sort_order ?? 0}
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
            disabled={saving || !((brand as Brand).name?.trim())}
            className="flex items-center gap-2 rounded-lg bg-[#7A021D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : isNew ? 'Add Brand' : 'Save Changes'}
          </button>
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

/* ─── main page ───────────────────────────────────────────── */
export default function BrandsPage() {
  const { showToast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');

  // modal state
  const [draft, setDraft] = useState<Partial<Brand>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await Brands.list(q || undefined);
      setBrands(items);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { void load(); }, [load]);

  function openAdd() {
    setEditingId(null);
    setDraft({ ...EMPTY });
    setShowDeleteConfirm(false);
    setIsOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditingId(brand.id);
    setDraft({ ...brand });
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
        await Brands.update(editingId, draft);
      } else {
        await Brands.create(draft);
      }
      invalidateTaxonomyCache();
      await load();
      closeModal();
      showToast('success', editingId ? 'Brand updated' : 'Brand created');
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
      await Brands.remove(editingId);
      invalidateTaxonomyCache();
      await load();
      closeModal();
      showToast('success', 'Brand deleted');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <>
      <div className="min-h-full bg-neutral-50 p-6">

        {/* ── header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2C0505]">Brands</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {loading ? 'Loading…' : `${brands.length} brand${brands.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Brand
          </button>
        </div>

        {/* ── toolbar: search + view toggle ── */}
        <div className="mb-6 flex items-center gap-3">
          {/* search */}
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search brands…"
              className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
            />
          </div>

          {/* view toggle */}
          <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setView('grid')}
              title="Grid view"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                view === 'grid'
                  ? 'bg-[#FDF8F4] shadow-sm'
                  : 'hover:bg-neutral-50'
              }`}
            >
              <IconGrid active={view === 'grid'} />
            </button>
            <button
              onClick={() => setView('list')}
              title="List view"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                view === 'list'
                  ? 'bg-[#FDF8F4] shadow-sm'
                  : 'hover:bg-neutral-50'
              }`}
            >
              <IconList active={view === 'list'} />
            </button>
          </div>
        </div>

        {/* ── loading skeleton ── */}
        {loading && view === 'grid' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        )}
        {loading && view === 'list' && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── empty state ── */}
        {!loading && brands.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
              <svg className="w-7 h-7 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                <circle cx="7" cy="7" r="1.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-700">No brands found</p>
            <p className="mt-1 text-xs text-neutral-400">Add your first brand to get started</p>
            <button
              onClick={openAdd}
              className="mt-4 flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Brand
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════
            GRID VIEW
        ══════════════════════════════════════ */}
        {!loading && brands.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {brands.map((brand) => {
              const [fg, bg] = brandColor(brand.id);
              return (
                <button
                  key={brand.id}
                  onClick={() => openEdit(brand)}
                  className="group relative flex flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden text-left"
                >
                  {/* avatar / logo area */}
                  <div
                    className="flex h-28 w-full items-center justify-center transition-opacity"
                    style={{ backgroundColor: bg }}
                  >
                    {brand.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="max-h-16 max-w-[80%] object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span
                      className={`${brand.logo_url ? 'hidden' : ''} text-3xl font-black tracking-tight select-none`}
                      style={{ color: fg }}
                    >
                      {initials(brand.name)}
                    </span>
                  </div>

                  {/* info */}
                  <div className="flex flex-1 flex-col p-4">
                    <p className="truncate text-sm font-semibold text-[#2C0505] leading-tight">
                      {brand.name}
                    </p>
                    {brand.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-500 leading-relaxed">
                        {brand.description}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-neutral-300 italic">No description</p>
                    )}
                  </div>

                  {/* tile variant badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-medium text-black/50 capitalize">
                      {brand.tile_variant}
                    </span>
                  </div>

                  {/* hover edit icon */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#2C0505]/0 group-hover:bg-[#2C0505]/5 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200">
                      <svg className="w-4 h-4 text-[#7A021D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════
            LIST VIEW
        ══════════════════════════════════════ */}
        {!loading && brands.length > 0 && view === 'list' && (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            {/* table header */}
            <div className="grid grid-cols-[3rem_1fr_1fr_1fr_7rem_5rem] items-center bg-[#FDF8F4] border-b border-neutral-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <span /> {/* avatar col */}
              <span>Name</span>
              <span>Slug</span>
              <span>Description</span>
              <span>Style</span>
              <span className="text-right">Order</span>
            </div>

            {brands.map((brand, idx) => {
              const [fg, bg] = brandColor(brand.id);
              return (
                <button
                  key={brand.id}
                  onClick={() => openEdit(brand)}
                  className={`group w-full grid grid-cols-[3rem_1fr_1fr_1fr_7rem_5rem] items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#FDF8F4]/60 ${
                    idx !== 0 ? 'border-t border-neutral-100' : ''
                  }`}
                >
                  {/* avatar */}
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black"
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    {brand.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="h-8 w-8 rounded-lg object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={brand.logo_url ? 'hidden' : ''}>
                      {initials(brand.name)}
                    </span>
                  </div>

                  {/* name */}
                  <span className="truncate text-sm font-semibold text-[#2C0505] group-hover:text-[#7A021D] transition-colors">
                    {brand.name}
                  </span>

                  {/* slug */}
                  <span className="truncate text-xs font-mono text-neutral-400">
                    {brand.slug || '—'}
                  </span>

                  {/* description */}
                  <span className="truncate text-xs text-neutral-500">
                    {brand.description || <span className="italic text-neutral-300">No description</span>}
                  </span>

                  {/* tile variant */}
                  <span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      brand.tile_variant === 'image'
                        ? 'bg-blue-50 text-blue-700'
                        : brand.tile_variant === 'logo'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {brand.tile_variant}
                    </span>
                  </span>

                  {/* sort order + edit hint */}
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs tabular-nums text-neutral-400">#{brand.sort_order}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-3.5 h-3.5 text-[#7A021D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── slide-over modal ── */}
      <BrandModal
        brand={isOpen ? draft : null}
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
    </>
  );
}
