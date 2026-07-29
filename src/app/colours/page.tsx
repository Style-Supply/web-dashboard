'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Colours } from '@/lib/taxonomy-api';
import { useToast } from '@/components/ui/Toast';
import { invalidateTaxonomyCache } from '@/hooks/useTaxonomy';
import type { Colour } from '@/types/taxonomy';

/* ─── Presets ──────────────────────────────────────────────── */
const COLOR_PRESETS = [
  { name: 'Burgundy', hex: '#7A021D' },
  { name: 'Maroon', hex: '#2C0505' },
  { name: 'Jet Black', hex: '#111111' },
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Ivory', hex: '#FDFBF7' },
  { name: 'Beige', hex: '#E5D3B3' },
  { name: 'Navy Blue', hex: '#0F2A4A' },
  { name: 'Royal Blue', hex: '#1D4ED8' },
  { name: 'Emerald', hex: '#065F46' },
  { name: 'Olive Green', hex: '#4D5D41' },
  { name: 'Gold / Mustard', hex: '#D97706' },
  { name: 'Rose Pink', hex: '#E11D48' },
  { name: 'Lavender', hex: '#A78BFA' },
  { name: 'Slate Grey', hex: '#475569' },
];

/* ─── Helpers ──────────────────────────────────────────────── */
function isLightColor(hex: string): boolean {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return false;
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 185;
}

function normalizeHex(input: string): string {
  let val = input.trim();
  if (!val.startsWith('#')) val = '#' + val;
  return val.toUpperCase();
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

/* ─── Colour Slide-Over Drawer ──────────────────────────────── */
const EMPTY_COLOUR: Partial<Colour> = {
  name: '',
  slug: '',
  hex: '#7A021D',
  sort_order: 0,
};

interface ColourDrawerProps {
  colour: Partial<Colour> | null;
  isNew: boolean;
  onChange: (patch: Partial<Colour>) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
  saving: boolean;
  deleting: boolean;
  showDeleteConfirm: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
}

function ColourDrawer({
  colour,
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
}: ColourDrawerProps) {
  const [showHelp, setShowHelp] = useState(false);

  if (!colour) return null;

  const currentHex = (colour.hex && /^#[0-9a-fA-F]{6}$/i.test(colour.hex)) ? colour.hex : '#7A021D';
  const lightBg = isLightColor(currentHex);

  function field(key: keyof Colour) {
    return (colour as Record<string, unknown>)[key] as string ?? '';
  }

  function handlePresetSelect(preset: { name: string; hex: string }) {
    onChange({
      hex: preset.hex,
      name: colour?.name ? colour.name : preset.name,
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
        style={{ animation: 'slideInRight .22s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-[#2C0505] px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 shadow-xs"
              style={{ backgroundColor: currentHex }}
            />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {isNew ? 'Add Colour' : 'Edit Colour'}
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                {isNew ? 'Create a new colour swatch' : field('name')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp((h) => !h)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                showHelp ? 'bg-[#7A021D] text-white' : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
              title="Toggle Help Guide"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help
            </button>
            {!isNew && !showDeleteConfirm && (
              <button
                onClick={onRequestDelete}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 hover:text-red-200 transition-colors"
              >
                Delete
              </button>
            )}
            {showDeleteConfirm && (
              <div className="flex items-center gap-2 rounded-lg bg-red-900/40 px-3 py-1.5">
                <span className="text-xs text-red-200">Delete colour?</span>
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="rounded px-2 py-0.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Yes'}
                </button>
                <button onClick={onCancelDelete} className="text-xs text-white/50 hover:text-white">
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

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Help Banner */}
          {showHelp && (
            <div className="rounded-xl border border-[#7A021D]/20 bg-[#FDF8F4] p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-[#7A021D]">
                <span className="flex items-center gap-1.5">
                  <span>💡</span> Colour Help & Guidelines
                </span>
                <button onClick={() => setShowHelp(false)} className="text-neutral-400 hover:text-neutral-600">✕</button>
              </div>
              <ul className="space-y-1.5 text-neutral-600 leading-relaxed list-disc pl-4">
                <li><strong className="text-[#2C0505]">Colour Name:</strong> Use clear fashion colour names (e.g. <em>Burgundy, Crimson, Champagne, Midnight Blue</em>).</li>
                <li><strong className="text-[#2C0505]">Hex Code:</strong> Standard 6-digit hex string (e.g. <code>#7A021D</code>). Use the native color picker or click a preset swatch below.</li>
                <li><strong className="text-[#2C0505]">Slug:</strong> URL slug automatically generated from the name if left empty.</li>
                <li><strong className="text-[#2C0505]">Sort Order:</strong> Lower numbers prioritize the colour in product variant pickers.</li>
              </ul>
            </div>
          )}

          {/* Color Preview & Picker */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Color Preview & Swatch</label>
            <div
              className={`flex items-center justify-between h-24 w-full rounded-2xl border p-4 shadow-sm transition-all ${
                lightBg ? 'border-neutral-300' : 'border-neutral-200'
              }`}
              style={{ backgroundColor: currentHex }}
            >
              <div>
                <span className={`text-lg font-bold ${lightBg ? 'text-neutral-900' : 'text-white'}`}>
                  {field('name') || 'Unnamed Colour'}
                </span>
                <p className={`text-xs font-mono mt-0.5 font-medium ${lightBg ? 'text-neutral-700' : 'text-white/80'}`}>
                  {currentHex}
                </p>
              </div>

              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-xl p-2 shadow-md border border-neutral-200">
                <input
                  type="color"
                  value={currentHex}
                  onChange={(e) => onChange({ hex: e.target.value.toUpperCase() })}
                  className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                />
                <span className="text-xs font-semibold text-neutral-600">Picker</span>
              </div>
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-500">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.hex + p.name}
                  type="button"
                  onClick={() => handlePresetSelect(p)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                    currentHex === p.hex
                      ? 'border-[#7A021D] bg-[#FDF8F4] text-[#7A021D] font-bold shadow-xs'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: p.hex }}
                  />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">
              Colour Name <span className="text-red-500">*</span>
            </label>
            <input
              value={field('name')}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
              placeholder="e.g. Burgundy"
            />
          </div>

          {/* Hex Input */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">
              Hex Code <span className="text-red-500">*</span>
            </label>
            <input
              value={field('hex')}
              onChange={(e) => onChange({ hex: normalizeHex(e.target.value) })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
              placeholder="#7A021D"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Slug</label>
            <input
              value={field('slug')}
              onChange={(e) => onChange({ slug: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
              placeholder="e.g. burgundy (auto-generated if empty)"
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Sort Order</label>
            <input
              type="number"
              value={(colour as Colour).sort_order ?? 0}
              onChange={(e) => onChange({ sort_order: Number(e.target.value) })}
              className="w-32 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-neutral-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !((colour as Colour).name?.trim()) || !(/^#[0-9a-fA-F]{6}$/i.test((colour as Colour).hex ?? ''))}
            className="flex items-center gap-2 rounded-lg bg-[#7A021D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : isNew ? 'Add Colour' : 'Save Changes'}
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

/* ─── Main Colours Page ─────────────────────────────────────── */
export default function ColoursPage() {
  const { showToast } = useToast();
  const [colours, setColours] = useState<Colour[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');

  // Drawer state
  const [draft, setDraft] = useState<Partial<Colour>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await Colours.list(q || undefined);
      setColours(items);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { void load(); }, [load]);

  function openAdd() {
    setEditingId(null);
    setDraft({ ...EMPTY_COLOUR });
    setShowDeleteConfirm(false);
    setIsOpen(true);
  }

  function openEdit(col: Colour) {
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
        await Colours.update(editingId, draft);
      } else {
        await Colours.create(draft);
      }
      invalidateTaxonomyCache();
      await load();
      closeModal();
      showToast('success', editingId ? 'Colour updated' : 'Colour created');
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
      await Colours.remove(editingId);
      invalidateTaxonomyCache();
      await load();
      closeModal();
      showToast('success', 'Colour deleted');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const filteredColours = useMemo(() => {
    if (!q.trim()) return colours;
    const lq = q.toLowerCase();
    return colours.filter(
      (c) => c.name.toLowerCase().includes(lq) || c.slug.toLowerCase().includes(lq) || c.hex.toLowerCase().includes(lq),
    );
  }, [colours, q]);

  return (
    <>
      <div className="min-h-full bg-neutral-50 p-6">
        {/* ── Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2C0505]">Colours</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {loading ? 'Loading…' : `${colours.length} colour swatch${colours.length !== 1 ? 'es' : ''}`}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Colour
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
              placeholder="Search by name, hex, or slug…"
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        )}
        {loading && view === 'list' && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Empty State ── */}
        {!loading && filteredColours.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-2xl">
              🎨
            </div>
            <p className="text-sm font-medium text-neutral-700">No colours found</p>
            <p className="mt-1 text-xs text-neutral-400">Add colour swatches for product variants</p>
            <button
              onClick={openAdd}
              className="mt-4 flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Colour
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════
            GRID VIEW
        ══════════════════════════════════════ */}
        {!loading && filteredColours.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {filteredColours.map((col) => {
              const hexVal = (col.hex && /^#[0-9a-fA-F]{6}$/i.test(col.hex)) ? col.hex : '#7A021D';
              const isLight = isLightColor(hexVal);

              return (
                <button
                  key={col.id}
                  onClick={() => openEdit(col)}
                  className="group relative flex flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden text-left"
                >
                  {/* Swatch Header */}
                  <div
                    className={`h-28 w-full transition-all relative ${
                      isLight ? 'border-b border-neutral-200' : ''
                    }`}
                    style={{ backgroundColor: hexVal }}
                  >
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold shadow-xs ${
                        isLight ? 'bg-black/10 text-neutral-900' : 'bg-white/20 text-white backdrop-blur-md'
                      }`}>
                        {hexVal}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#2C0505] group-hover:text-[#7A021D] transition-colors truncate">
                        {col.name}
                      </h3>
                      <p className="text-xs font-mono text-neutral-400 mt-0.5 truncate">
                        {col.slug}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Order #{col.sort_order}</span>
                      <span className="opacity-0 group-hover:opacity-100 text-[#7A021D] font-semibold transition-opacity">
                        Edit →
                      </span>
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
        {!loading && filteredColours.length > 0 && view === 'list' && (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[3.5rem_1fr_1fr_1fr_5rem] items-center bg-[#FDF8F4] border-b border-neutral-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <span>Swatch</span>
              <span>Colour Name</span>
              <span>Hex Code</span>
              <span>Slug</span>
              <span className="text-right">Actions</span>
            </div>

            {filteredColours.map((col, idx) => {
              const hexVal = (col.hex && /^#[0-9a-fA-F]{6}$/i.test(col.hex)) ? col.hex : '#7A021D';
              return (
                <div
                  key={col.id}
                  className={`group grid grid-cols-[3.5rem_1fr_1fr_1fr_5rem] items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#FDF8F4]/50 ${
                    idx !== 0 ? 'border-t border-neutral-100' : ''
                  }`}
                >
                  {/* Swatch circle */}
                  <div
                    className="h-8 w-8 rounded-xl border border-black/15 shadow-xs"
                    style={{ backgroundColor: hexVal }}
                  />

                  <span className="truncate text-sm font-semibold text-[#2C0505] group-hover:text-[#7A021D] transition-colors">
                    {col.name}
                  </span>

                  <div>
                    <span className="font-mono text-xs font-bold text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-1 rounded-md">
                      {hexVal}
                    </span>
                  </div>

                  <span className="truncate text-xs font-mono text-neutral-400">
                    {col.slug}
                  </span>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(col)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-[#7A021D] transition-colors"
                      title="Edit Colour"
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

      {/* ── Colour Slide-Over Drawer ── */}
      <ColourDrawer
        colour={isOpen ? draft : null}
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
