'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Collections, Looks } from '@/lib/taxonomy-api';
import { useToast } from '@/components/ui/Toast';
import { invalidateTaxonomyCache } from '@/hooks/useTaxonomy';
import { supabase } from '@/lib/supabase';
import { API_BASE, ApiError } from '@/lib/api';
import type { Collection, Look } from '@/types/taxonomy';

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

/* ─── Manage Looks Drawer ──────────────────────────────────── */
interface ManageLooksDrawerProps {
  collection: Collection | null;
  looks: Look[];
  onClose: () => void;
  onAddLook: (name: string) => Promise<void>;
  onDeleteLook: (lookId: string) => Promise<void>;
}

function ManageLooksDrawer({
  collection,
  looks,
  onClose,
  onAddLook,
  onDeleteLook,
}: ManageLooksDrawerProps) {
  const [newLookName, setNewLookName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
        style={{ animation: 'slideInRight .22s ease-out' }}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-[#2C0505] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Looks in {collection.name}</h2>
              <p className="text-xs text-white/50 mt-0.5">{looks.length} look{looks.length !== 1 ? 's' : ''}</p>
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

        {/* body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Add Look */}
          <div className="rounded-xl border border-neutral-200 bg-[#FDF8F4] p-4 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#7A021D]">
              Add New Look
            </label>
            <div className="flex gap-2">
              <input
                value={newLookName}
                onChange={(e) => setNewLookName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
                placeholder="Look name (e.g. Look 01 - Sunset)"
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D]"
              />
              <button
                onClick={() => void handleAdd()}
                disabled={adding || !newLookName.trim()}
                className="rounded-lg bg-[#7A021D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-colors shrink-0"
              >
                {adding ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>

          {/* Looks list */}
          <div>
            <h3 className="mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Existing Looks ({looks.length})
            </h3>

            {looks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
                <p className="text-xs font-medium text-neutral-500">No looks added yet</p>
                <p className="mt-1 text-[11px] text-neutral-400">Type a name above to add a look</p>
              </div>
            ) : (
              <div className="space-y-2">
                {looks.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 shadow-sm hover:border-neutral-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDF8F4] text-[#7A021D] font-bold text-xs">
                        ✦
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#2C0505]">{l.name}</p>
                        <p className="text-[11px] font-mono text-neutral-400">{l.slug}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => void handleDelete(l.id)}
                      disabled={deletingId === l.id}
                      className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors"
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
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-300 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
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

  // Looks handlers
  async function handleAddLook(collectionId: string, name: string) {
    try {
      await Looks.create({ collection_id: collectionId, name });
      invalidateTaxonomyCache();
      await load();
      // update active modal collection reference
      setManagingLooksCol((prev) => {
        if (!prev) return null;
        const newLookList = [...(prev.looks ?? []), { id: Date.now().toString(), collection_id: collectionId, name, slug: '', description: null, hero_url: null, sort_order: 0 }];
        return { ...prev, looks: newLookList };
      });
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
      setManagingLooksCol((prev) => {
        if (!prev) return null;
        return { ...prev, looks: (prev.looks ?? []).filter((l) => l.id !== lookId) };
      });
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
                        onClick={() => setManagingLooksCol(col)}
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
                      onClick={() => setManagingLooksCol(col)}
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
