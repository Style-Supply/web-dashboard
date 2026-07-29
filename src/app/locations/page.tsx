'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Locations } from '@/lib/taxonomy-api';
import { useToast } from '@/components/ui/Toast';
import { invalidateTaxonomyCache } from '@/hooks/useTaxonomy';
import type { LocationT } from '@/types/taxonomy';

/* ─── Location Type / Icon Mapper ─────────────────────────── */
function locationDetails(name: string): { icon: string; bg: string; text: string } {
  const n = name.toLowerCase();
  if (n.includes('warehouse') || n.includes('depot') || n.includes('stock')) {
    return { icon: '🏬', bg: 'bg-[#FDF8F4] border-[#7A021D]/20', text: 'text-[#7A021D]' };
  }
  if (n.includes('studio') || n.includes('photo')) {
    return { icon: '📸', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-900' };
  }
  if (n.includes('store') || n.includes('shop') || n.includes('retail')) {
    return { icon: '🛍️', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-900' };
  }
  if (n.includes('showroom') || n.includes('display')) {
    return { icon: '🏛️', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-900' };
  }
  if (n.includes('vault') || n.includes('secure') || n.includes('vip')) {
    return { icon: '🔒', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-900' };
  }
  if (n.includes('fulfillment') || n.includes('dispatch')) {
    return { icon: '📦', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-900' };
  }
  return { icon: '📍', bg: 'bg-neutral-50 border-neutral-200', text: 'text-[#2C0505]' };
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

/* ─── Location Slide-Over Drawer ────────────────────────────── */
const EMPTY_LOCATION: Partial<LocationT> = {
  name: '',
  slug: '',
  sort_order: 0,
};

interface LocationDrawerProps {
  location: Partial<LocationT> | null;
  isNew: boolean;
  onChange: (patch: Partial<LocationT>) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
  saving: boolean;
  deleting: boolean;
  showDeleteConfirm: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
}

function LocationDrawer({
  location,
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
}: LocationDrawerProps) {
  const [showHelp, setShowHelp] = useState(false);

  if (!location) return null;

  function field(key: keyof LocationT) {
    return (location as Record<string, unknown>)[key] as string ?? '';
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white font-bold text-sm">
              📍
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {isNew ? 'Add Location' : 'Edit Location'}
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                {isNew ? 'Create a inventory location' : field('name')}
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
                <span className="text-xs text-red-200">Delete location?</span>
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
                  <span>💡</span> Location Help & Guidelines
                </span>
                <button onClick={() => setShowHelp(false)} className="text-neutral-400 hover:text-neutral-600">✕</button>
              </div>
              <ul className="space-y-1.5 text-neutral-600 leading-relaxed list-disc pl-4">
                <li><strong className="text-[#2C0505]">Location Name:</strong> Specify inventory locations (e.g. <em>Main Warehouse, Flagship Store, Photo Studio, VIP Vault</em>).</li>
                <li><strong className="text-[#2C0505]">Automatic Badges:</strong> Names containing keywords like <em>Warehouse (🏬), Store (🛍️), Studio (📸), Showroom (🏛️), Vault (🔒), Fulfillment (📦)</em> automatically display themed icons.</li>
                <li><strong className="text-[#2C0505]">Slug:</strong> URL-safe identifier auto-generated from the location name if empty.</li>
                <li><strong className="text-[#2C0505]">Sort Order:</strong> Priority sequence for location dropdowns across inventory management.</li>
              </ul>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">
              Location Name <span className="text-red-500">*</span>
            </label>
            <input
              value={field('name')}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
              placeholder="e.g. Main Warehouse"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Slug</label>
            <input
              value={field('slug')}
              onChange={(e) => onChange({ slug: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
              placeholder="e.g. main-warehouse (auto-generated if empty)"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Sort Order</label>
            <input
              type="number"
              value={(location as LocationT).sort_order ?? 0}
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
            disabled={saving || !((location as LocationT).name?.trim())}
            className="flex items-center gap-2 rounded-lg bg-[#7A021D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : isNew ? 'Add Location' : 'Save Changes'}
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

/* ─── Main Locations Page ───────────────────────────────────── */
export default function LocationsPage() {
  const { showToast } = useToast();
  const [locations, setLocations] = useState<LocationT[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');

  // Drawer state
  const [draft, setDraft] = useState<Partial<LocationT>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await Locations.list(q || undefined);
      setLocations(items);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { void load(); }, [load]);

  function openAdd() {
    setEditingId(null);
    setDraft({ ...EMPTY_LOCATION });
    setShowDeleteConfirm(false);
    setIsOpen(true);
  }

  function openEdit(loc: LocationT) {
    setEditingId(loc.id);
    setDraft({ ...loc });
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
        await Locations.update(editingId, draft);
      } else {
        await Locations.create(draft);
      }
      invalidateTaxonomyCache();
      await load();
      closeModal();
      showToast('success', editingId ? 'Location updated' : 'Location created');
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
      await Locations.remove(editingId);
      invalidateTaxonomyCache();
      await load();
      closeModal();
      showToast('success', 'Location deleted');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const filteredLocations = useMemo(() => {
    if (!q.trim()) return locations;
    const lq = q.toLowerCase();
    return locations.filter(
      (loc) => loc.name.toLowerCase().includes(lq) || loc.slug.toLowerCase().includes(lq),
    );
  }, [locations, q]);

  return (
    <>
      <div className="min-h-full bg-neutral-50 p-6">
        {/* ── Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2C0505]">Locations</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {loading ? 'Loading…' : `${locations.length} inventory location${locations.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Location
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
              placeholder="Search locations…"
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-neutral-200 animate-pulse" />
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
        {!loading && filteredLocations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-2xl">
              📍
            </div>
            <p className="text-sm font-medium text-neutral-700">No locations found</p>
            <p className="mt-1 text-xs text-neutral-400">Add physical locations to track stock availability</p>
            <button
              onClick={openAdd}
              className="mt-4 flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Location
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════
            GRID VIEW
        ══════════════════════════════════════ */}
        {!loading && filteredLocations.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredLocations.map((loc) => {
              const details = locationDetails(loc.name);

              return (
                <button
                  key={loc.id}
                  onClick={() => openEdit(loc)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${details.bg} text-xl shadow-xs`}>
                      {details.icon}
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                      #{loc.sort_order}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-[#2C0505] group-hover:text-[#7A021D] transition-colors truncate">
                      {loc.name}
                    </h3>
                    <p className="text-xs font-mono text-neutral-400 mt-0.5 truncate">
                      {loc.slug}
                    </p>
                  </div>

                  {/* Hover edit action icon */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FDF8F4] text-[#7A021D]">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        {!loading && filteredLocations.length > 0 && view === 'list' && (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[3rem_1fr_1fr_6rem_5rem] items-center bg-[#FDF8F4] border-b border-neutral-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <span />
              <span>Location Name</span>
              <span>Slug</span>
              <span>Sort Order</span>
              <span className="text-right">Actions</span>
            </div>

            {filteredLocations.map((loc, idx) => {
              const details = locationDetails(loc.name);
              return (
                <div
                  key={loc.id}
                  className={`group grid grid-cols-[3rem_1fr_1fr_6rem_5rem] items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#FDF8F4]/50 ${
                    idx !== 0 ? 'border-t border-neutral-100' : ''
                  }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${details.bg} text-sm`}>
                    {details.icon}
                  </div>

                  <span className="truncate text-sm font-semibold text-[#2C0505] group-hover:text-[#7A021D] transition-colors">
                    {loc.name}
                  </span>

                  <span className="truncate text-xs font-mono text-neutral-400">
                    {loc.slug}
                  </span>

                  <span className="text-xs font-mono text-neutral-500">
                    #{loc.sort_order}
                  </span>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(loc)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-[#7A021D] transition-colors"
                      title="Edit Location"
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

      {/* ── Location Slide-Over Drawer ── */}
      <LocationDrawer
        location={isOpen ? draft : null}
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
