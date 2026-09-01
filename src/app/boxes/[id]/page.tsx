'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import {
  getBox,
  updateBox,
  packBox,
  dispatchBox,
  deliverBox,
  startSession,
  extendSession,
  endSession,
  deleteBox,
  updateBoxProfile,
  updateBoxItem,
  removeBoxItem,
  addBoxItem,
} from '@/lib/boxes';
import { request } from '@/lib/api';
import { markReceived, setPickupStatus } from '@/lib/returns';
import type { BoxDetail } from '@/types/box';
import type { ProductListResponse, Product } from '@/types/product';

const STATUS_LABELS: Record<string, string> = {
  building: 'Building',
  full: 'Full',
  pending_membership_payment: 'Awaiting Membership Payment',
  pending_payment_verification: 'Payment Verifying',
  confirmed: 'Confirmed',
  packing: 'Packing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  boutique_session_active: 'Session Active (48h)',
  decision_pending: 'Decision Pending',
  purchase_pending: 'Purchase Pending',
  returns_review: 'Returns Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  building: 'bg-blue-100 text-blue-700',
  full: 'bg-indigo-100 text-indigo-700',
  pending_membership_payment: 'bg-yellow-100 text-yellow-700',
  pending_payment_verification: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-green-100 text-green-700',
  packing: 'bg-teal-100 text-teal-700',
  out_for_delivery: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  boutique_session_active: 'bg-purple-100 text-purple-700',
  decision_pending: 'bg-pink-100 text-pink-700',
  purchase_pending: 'bg-rose-100 text-rose-700',
  returns_review: 'bg-amber-100 text-amber-700',
  completed: 'bg-neutral-100 text-neutral-600',
  cancelled: 'bg-red-100 text-red-700',
};

const DECISION_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  keep: 'bg-green-100 text-green-700',
  return: 'bg-red-100 text-red-700',
};

function fmt(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function sessionRemaining(endsAt: string | null | undefined): string {
  if (!endsAt) return '—';
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m remaining`;
}

function parseItemQc(qcNotes?: string | null, rawQcStatus?: string | null) {
  let brand = { status: 'pending', notes: '', images: [] as string[] };
  let customer = { status: rawQcStatus ?? 'pending', notes: '', images: [] as string[] };

  if (!qcNotes) {
    return { brand, customer };
  }

  try {
    if (typeof qcNotes === 'string' && qcNotes.startsWith('{') && qcNotes.endsWith('}')) {
      const parsed = JSON.parse(qcNotes);
      if (parsed.brand) {
        brand = {
          status: parsed.brand.status ?? 'pending',
          notes: parsed.brand.notes ?? '',
          images: Array.isArray(parsed.brand.images) ? parsed.brand.images : [],
        };
      }
      if (parsed.customer) {
        customer = {
          status: parsed.customer.status ?? rawQcStatus ?? 'pending',
          notes: parsed.customer.notes ?? '',
          images: Array.isArray(parsed.customer.images) ? parsed.customer.images : [],
        };
      }
    } else {
      customer.notes = qcNotes;
    }
  } catch {
    customer.notes = qcNotes;
  }

  return { brand, customer };
}

// ── Edit Modal Components ──────────────────────────────────────────────────────

function ProductSearch({ onSelect }: { onSelect: (p: Product) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await request<ProductListResponse>(`/api/admin/products?q=${encodeURIComponent(query)}&limit=10`);
        setResults(res.items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative border rounded-lg p-3 bg-neutral-50 mb-4">
      <label className="block text-xs font-medium text-neutral-600 mb-1">Search Product to Add</label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type product name or SKU..."
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm mb-2"
      />
      {loading && <div className="text-xs text-neutral-500">Searching...</div>}
      {!loading && results.length > 0 && (
        <ul className="max-h-40 overflow-y-auto divide-y border rounded bg-white">
          {results.map((p) => (
            <li
              key={p.id}
              onClick={() => onSelect(p)}
              className="p-2 text-sm hover:bg-neutral-100 cursor-pointer flex justify-between"
            >
              <span>{p.name} {p.brand?.name ? `(${p.brand.name})` : ''}</span>
              <span className="text-neutral-500">{p.variants.length} variants</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BoxItemEditor({
  item,
  boxId,
  onRefresh,
}: {
  item: BoxDetail['items'][0];
  boxId: string;
  onRefresh: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const handleVariantChange = async (variantId: string) => {
    setSaving(true);
    try {
      await updateBoxItem(boxId, item.id, { variant_id: variantId });
      showToast('success', 'Size updated');
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update size');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Remove this item from the box?')) return;
    setSaving(true);
    try {
      await removeBoxItem(boxId, item.id);
      showToast('success', 'Item removed');
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove');
      setSaving(false); // only stop loading on error, on success unmounts
    }
  };

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0 border-neutral-100">
      <div className="flex gap-3 items-center">
        {item.product.thumbnail_url ? (
          <img src={item.product.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover" />
        ) : (
          <div className="w-10 h-10 rounded bg-neutral-200 flex items-center justify-center text-xs">No IMG</div>
        )}
        <div>
          <div className="text-sm font-medium">{item.product.name}</div>
          <div className="text-xs text-neutral-500">
            {item.variant.size} {item.variant.colour ? `· ${item.variant.colour}` : ''}
          </div>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <select
          value={item.variant.id}
          onChange={(e) => void handleVariantChange(e.target.value)}
          disabled={saving}
          className="text-xs border rounded p-1 min-w-[80px]"
        >
          {(item.product.variants || []).map((v) => (
            <option key={v.id} value={v.id} disabled={v.quantity <= 0}>
              {v.size} {v.colour?.name ? `(${v.colour.name})` : ''} {v.quantity <= 0 ? '- Out of Stock' : ''}
            </option>
          ))}
        </select>
        <button
          onClick={() => void handleRemove()}
          disabled={saving}
          className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors disabled:opacity-50"
          title="Remove Item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface EditModalProps {
  box: BoxDetail;
  onClose: () => void;
  onSave: (tracking: string | null, status: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

function EditModal({ box, onClose, onSave, onRefresh }: EditModalProps): React.ReactElement {
  const { showToast } = useToast();
  
  // Basic Info State
  const [tracking, setTracking] = useState(box.tracking_number ?? '');
  const [status, setStatus] = useState<string>(box.status);
  
  // Profile State
  const [name, setName] = useState(box.user?.full_name ?? '');
  const [phone, setPhone] = useState(box.user?.phone ?? '');

  // Add Item State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');

  const [savingGlobal, setSavingGlobal] = useState(false);

  const handleSaveGlobal = async () => {
    setSavingGlobal(true);
    try {
      // Save Basic Info
      await onSave(tracking.trim() || null, status);
      // Save Profile
      if (box.user) {
        await updateBoxProfile(box.id, { full_name: name, phone });
      }
      showToast('success', 'Box and Profile updated');
      await onRefresh();
      onClose();
    } catch (err) {
      // onSave already toasts error
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedProduct || !selectedVariantId) return;
    setSavingGlobal(true);
    try {
      await addBoxItem(box.id, selectedProduct.id, selectedVariantId);
      showToast('success', 'Item added');
      setSelectedProduct(null);
      setSelectedVariantId('');
      await onRefresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setSavingGlobal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl my-8">
        <h2 className="text-xl font-semibold text-[#2C0505] mb-6">Edit Box Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left Column: Basic Info & Profile */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium text-neutral-800 border-b pb-2">Status & Tracking</h3>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tracking Number</label>
                <input
                  type="text"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="e.g. BD123456789IN"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]"
                />
              </div>
            </div>

            {box.user && (
              <div className="space-y-4">
                <h3 className="font-medium text-neutral-800 border-b pb-2">Member Profile</h3>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]"
                  />
                </div>
                <p className="text-xs text-neutral-400">Note: Saving will update this member's global profile.</p>
              </div>
            )}
          </div>

          {/* Right Column: Box Items */}
          <div className="space-y-4">
            <h3 className="font-medium text-neutral-800 border-b pb-2">Box Items ({box.items.length}/{box.max_items})</h3>
            
            <div className="bg-white border rounded-lg overflow-hidden divide-y">
              {box.items.map((item) => (
                <BoxItemEditor key={item.id} item={item} boxId={box.id} onRefresh={onRefresh} />
              ))}
              {box.items.length === 0 && (
                <div className="p-4 text-sm text-neutral-500 text-center">No items in box.</div>
              )}
            </div>

            {box.items.length < box.max_items && (
              <div className="mt-4">
                {!selectedProduct ? (
                  <ProductSearch onSelect={(p) => { setSelectedProduct(p); setSelectedVariantId(p.variants[0]?.id || ''); }} />
                ) : (
                  <div className="border rounded-lg p-3 bg-neutral-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium">{selectedProduct.name}</div>
                      <button onClick={() => setSelectedProduct(null)} className="text-xs text-neutral-500 hover:text-neutral-700">Cancel</button>
                    </div>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm mb-3"
                    >
                      {selectedProduct.variants.map((v) => (
                        <option key={v.id} value={v.id} disabled={v.quantity <= 0}>
                          {v.size} {v.colour?.name ? `(${v.colour.name})` : ''} {v.quantity <= 0 ? '- Out of Stock' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => void handleAddItem()}
                      disabled={savingGlobal || !selectedVariantId}
                      className="w-full bg-[#7A021D] text-white text-sm py-1.5 rounded-md hover:bg-[#8B1A35] disabled:opacity-50"
                    >
                      {savingGlobal ? 'Adding...' : 'Add to Box'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 border-t pt-4">
          <button
            onClick={onClose}
            disabled={savingGlobal}
            className="rounded-lg px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSaveGlobal()}
            disabled={savingGlobal}
            className="rounded-lg bg-[#7A021D] px-6 py-2 text-sm font-medium text-white hover:bg-[#8B1A35] transition-colors disabled:opacity-50 shadow-sm"
          >
            {savingGlobal ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BoxDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [box, setBox] = useState<BoxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(searchParams.get('edit') === 'true');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBox(params.id);
      setBox(data);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load box');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);

  // ── Edit Save ──────────────────────────────────────────────────────────────
  async function handleSaveEdit(tracking: string | null, status: string): Promise<void> {
    setSaving(true);
    try {
      const updated = await updateBox(params.id, { tracking_number: tracking, status });
      setBox((prev) => prev ? { ...prev, ...updated } : prev);
      setShowEdit(false);
      showToast('success', 'Box updated successfully');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(): Promise<void> {
    if (!confirm(`Delete this box permanently? This cannot be undone.\n\nBox ID: ${params.id}`)) return;
    setActionLoading(true);
    try {
      await deleteBox(params.id);
      showToast('success', 'Box deleted');
      router.push('/boxes');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete');
      setActionLoading(false);
    }
  }

  // ── Lifecycle Actions ──────────────────────────────────────────────────────
  async function doAction(action: () => Promise<unknown>, msg: string): Promise<void> {
    setActionLoading(true);
    try {
      await action();
      showToast('success', msg);
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-neutral-400 text-sm">Loading box…</div>
      </div>
    );
  }

  if (!box) {
    return (
      <div className="p-6">
        <div className="text-red-500">Box not found.</div>
        <Link href="/boxes" className="mt-2 text-sm text-[#7A021D] hover:underline">← Back to boxes</Link>
      </div>
    );
  }

  return (
    <>
      {showEdit && (
        <EditModal
          box={box}
          onClose={() => setShowEdit(false)}
          onSave={handleSaveEdit}
          onRefresh={async () => void load()}
        />
      )}

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href="/boxes" className="text-sm text-neutral-500 hover:text-[#7A021D] flex items-center gap-1 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Boxes
            </Link>
            <h1 className="text-2xl font-semibold text-[#2C0505]">Box Detail</h1>
            <p className="text-xs text-neutral-400 font-mono mt-1">{box.id}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-[#2C0505] hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => void handleDelete()}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>

        {/* Status Badge + Lifecycle Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[box.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
            {STATUS_LABELS[box.status] ?? box.status}
          </span>

          {/* Boutique session timer */}
          {box.status === 'boutique_session_active' && (
            <span className="text-xs text-purple-600 font-medium">
              ⏱ {sessionRemaining(box.session_ends_at)}
            </span>
          )}

          {/* Lifecycle action buttons */}
          {box.status === 'confirmed' && (
            <button onClick={() => void doAction(() => packBox(box.id), 'Box moved to packing')} disabled={actionLoading} className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50">Pack</button>
          )}
          {box.status === 'packing' && (
            <button onClick={() => { const t = prompt('Tracking number (optional):') ?? undefined; void doAction(() => dispatchBox(box.id, t ?? undefined), 'Box dispatched'); }} disabled={actionLoading} className="rounded-lg bg-cyan-600 px-3 py-1 text-xs font-medium text-white hover:bg-cyan-700 disabled:opacity-50">Dispatch</button>
          )}
          {box.status === 'out_for_delivery' && (
            <button onClick={() => void doAction(() => deliverBox(box.id), 'Marked as delivered')} disabled={actionLoading} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Mark Delivered</button>
          )}
          {box.status === 'delivered' && (
            <button onClick={() => void doAction(() => startSession(box.id), '48h session started')} disabled={actionLoading} className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50">Start Session</button>
          )}
          {box.status === 'boutique_session_active' && (
            <>
              <button onClick={() => { const h = parseInt(prompt('Extend by hours:', '24') ?? '24', 10); if (h > 0) void doAction(() => extendSession(box.id, h), `Session extended ${h}h`); }} disabled={actionLoading} className="rounded-lg bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200 disabled:opacity-50">Extend</button>
              <button onClick={() => void doAction(() => endSession(box.id), 'Session ended')} disabled={actionLoading} className="rounded-lg bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700 hover:bg-pink-200 disabled:opacity-50">End Session</button>
            </>
          )}
        </div>

        {/* Two-column info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Member Info */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="text-xs font-semibold uppercase text-neutral-400 mb-3">Member</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Name</span>
                <span className="font-medium text-[#2C0505]">{box.user?.full_name ?? box.profiles?.full_name ?? 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Phone</span>
                <span className="font-medium text-[#2C0505]">{box.user?.phone ?? box.profiles?.phone ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">User ID</span>
                <span className="font-mono text-xs text-neutral-400">{box.user_id.slice(0, 8)}…</span>
              </div>
            </div>
          </div>

          {/* Box Info */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="text-xs font-semibold uppercase text-neutral-400 mb-3">Box Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Max Items</span>
                <span className="font-medium">{box.max_items}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Tracking</span>
                <span className="font-mono text-xs">{box.tracking_number ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Created</span>
                <span className="text-neutral-600">{fmt(box.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          {box.address && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 className="text-xs font-semibold uppercase text-neutral-400 mb-3">Delivery Address</h2>
              <div className="text-sm text-neutral-600 space-y-1">
                {(() => {
                  const addr = box.address as Record<string, unknown>;
                  return (
                    <>
                      {addr.apartment != null && <div>{String(addr.apartment)}</div>}
                      {addr.locality != null && <div>{String(addr.locality)}</div>}
                      {addr.state != null && (
                        <div>{String(addr.state)}{addr.pincode != null ? ` — ${String(addr.pincode)}` : ''}</div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="text-xs font-semibold uppercase text-neutral-400 mb-3">Timeline</h2>
            <div className="space-y-1.5 text-xs">
              {[
                ['Confirmed', box.confirmed_at],
                ['Paid', box.paid_at],
                ['Packing', box.packing_at],
                ['Dispatched', box.out_for_delivery_at],
                ['Outbound Delivered', box.delivered_at],
                ['Member Received Box', box.received_at],
                ['Session Start', box.session_started_at],
                ['Session End', box.session_ended_at],
                ['Decisions Locked', box.decisions_locked_at],
                ['Returns Received at Warehouse', box.pickup_status === 'received_at_warehouse' || box.status === 'completed' ? (box.updated_at || box.decisions_locked_at) : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={String(label)} className="flex justify-between">
                  <span className="text-neutral-400">{label}</span>
                  <span className="text-neutral-600">{fmt(value as string)}</span>
                </div>
              ))}
              {!box.confirmed_at && !box.paid_at && (
                <div className="text-neutral-300 italic">No timeline events yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Reverse Logistics & Returns Tracking (Active when in returns flow) */}
        {(box.status === 'returns_review' || box.status === 'completed' || box.pickup_status || box.items.some(i => i.decision === 'return' || i.decision === 'rent')) && (
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-white p-5 space-y-4 shadow-xs">
            {(() => {
              const currentSelectValue =
                box.status === 'completed'
                  ? 'completed'
                  : box.pickup_status === 'picked_up' && Boolean(box.received_at)
                  ? 'received_at_warehouse'
                  : box.pickup_status === 'picked_up'
                  ? 'picked_up'
                  : box.pickup_status === 'in_transit'
                  ? 'in_transit'
                  : 'scheduled';

              const isStep1Done = Boolean(box.pickup_status) || box.status === 'returns_review' || box.status === 'completed';
              const isStep2Done = ['in_transit', 'picked_up', 'received_at_warehouse', 'completed'].includes(currentSelectValue);
              const isStep3Done = ['picked_up', 'received_at_warehouse', 'completed'].includes(currentSelectValue);
              const isStep4Done = ['received_at_warehouse', 'completed'].includes(currentSelectValue);
              const isStep5Done = currentSelectValue === 'completed';

              const steps = [
                { key: 'scheduled', label: '1. Pickup Scheduled', icon: '📅', done: isStep1Done },
                { key: 'in_transit', label: '2. In Transit', icon: '🚚', done: isStep2Done },
                { key: 'picked_up', label: '3. Picked Up', icon: '📦', done: isStep3Done },
                { key: 'received_at_warehouse', label: '4. At Warehouse', icon: '🏢', done: isStep4Done },
                { key: 'completed', label: '5. Completed', icon: '✨', done: isStep5Done },
              ] as const;

              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/60 pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#2C0505]">Reverse Logistics &amp; Returns Pipeline</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Track reverse courier pickup from member and receive returned garments for Quality Control.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="pickup-status-select" className="text-xs font-bold text-[#7A021D] uppercase tracking-wider">
                          Status:
                        </label>
                        <select
                          id="pickup-status-select"
                          value={currentSelectValue}
                          disabled={actionLoading}
                          onChange={(e) => {
                            const newStatus = e.target.value as any;
                            void doAction(
                              () => setPickupStatus(box.id, newStatus),
                              `Status updated to ${newStatus.replace(/_/g, ' ')}`
                            );
                          }}
                          className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-[#7A021D] shadow-xs cursor-pointer focus:border-[#7A021D] focus:ring-1 focus:ring-[#7A021D] focus:outline-hidden"
                        >
                          <option value="scheduled">📅 1. Pickup Scheduled</option>
                          <option value="in_transit">🚚 2. In Transit</option>
                          <option value="picked_up">📦 3. Picked Up</option>
                          <option value="received_at_warehouse">🏢 4. Received at Warehouse</option>
                          <option value="completed">✨ 5. Completed</option>
                        </select>
                      </div>

                      {box.tracking_number && (
                        <div className="text-xs bg-white border border-neutral-200 rounded-lg px-2.5 py-1 font-mono text-neutral-700">
                          AWB: <span className="font-semibold text-black">{box.tracking_number}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const code = prompt('Enter Return Courier Tracking AWB:', box.tracking_number || '');
                          if (code === null) return;
                          void doAction(
                            () => setPickupStatus(box.id, (box.pickup_status as any) || 'in_transit', code.trim() || undefined),
                            'Return tracking number updated'
                          );
                        }}
                        disabled={actionLoading}
                        className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 shadow-2xs"
                      >
                        🏷️ {box.tracking_number ? 'Edit AWB' : '+ AWB'}
                      </button>
                    </div>
                  </div>

                  {/* 5-Step Visual Stepper */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    {steps.map((step) => (
                      <div
                        key={step.key}
                        className={`rounded-xl border p-3 text-center transition-all ${
                          step.done
                            ? 'border-emerald-300 bg-emerald-50/80 text-emerald-900 shadow-2xs font-semibold'
                            : 'border-neutral-200 bg-white/70 text-neutral-400 font-medium'
                        }`}
                      >
                        <div className="text-xl mb-1">{step.icon}</div>
                        <div className="text-xs">{step.label}</div>
                        <div className="text-[10px] mt-1.5 font-bold uppercase tracking-wider">
                          {step.done ? '✓ Done' : 'Pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Items Table */}
        <div>
          <h2 className="text-base font-semibold text-[#2C0505] mb-3">Items ({box.items?.length ?? 0})</h2>
          {!box.items || box.items.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-400">
              No items in this box yet
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500 border-b">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3">Size / Colour</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="px-4 py-3">QC</th>
                    <th className="px-4 py-3 text-right">Retail Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {box.items.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.product.thumbnail_url && (
                            <img src={item.product.thumbnail_url} alt="" className="h-10 w-8 rounded object-cover" />
                          )}
                          <span className="font-medium text-[#2C0505]">{item.product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{item.product.brand ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{item.variant.size}</span>
                        {item.variant.colour && <span className="ml-1 text-xs text-neutral-400">{item.variant.colour}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.decision}
                          disabled={actionLoading}
                          onChange={async (e) => {
                            const newDecision = e.target.value as any;
                            setBox((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                items: prev.items.map((it) => (it.id === item.id ? { ...it, decision: newDecision } : it)),
                              };
                            });
                            try {
                              await updateBoxItem(box.id, item.id, { decision: newDecision });
                              showToast('success', `Item decision updated to ${newDecision}`);
                            } catch (err) {
                              showToast('error', err instanceof Error ? err.message : 'Failed to update decision');
                              await load();
                            }
                          }}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize cursor-pointer border-0 shadow-2xs focus:ring-1 focus:ring-black ${DECISION_COLORS[item.decision] ?? ''}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="keep">Keep</option>
                          <option value="return">Return</option>
                          <option value="rent">Rent</option>
                        </select>
                        {item.return_reason && (
                          <p className="text-xs text-neutral-400 mt-0.5">{item.return_reason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.qc_status ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            item.qc_status === 'passed' ? 'bg-green-100 text-green-700' :
                            item.qc_status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.qc_status}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ₹{(item.product.retail_price_minor / 100).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Two-Checkpoint Quality Control (QC) Cards */}
        {box.items && box.items.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-neutral-200">
            <h2 className="text-base font-semibold text-[#2C0505]">Items Quality Control (Two Checkpoints)</h2>
            <div className="grid grid-cols-1 gap-4">
              {box.items.map((item) => {
                const isCustomerPickupUnlocked = box.pickup_status === 'picked_up' || box.status === 'returns_review';
                const qcData = parseItemQc(item.qc_notes, item.qc_status);

                return (
                  <div key={`qc-${item.id}`} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-3">
                        {item.product.thumbnail_url && (
                          <img src={item.product.thumbnail_url} alt="" className="h-10 w-8 rounded object-cover" />
                        )}
                        <div>
                          <div className="font-semibold text-sm text-[#2C0505]">{item.product.name}</div>
                          <div className="text-xs text-neutral-500">{item.product.brand ?? '—'} · Size: {item.variant.size}</div>
                        </div>
                      </div>
                      <select
                        value={item.decision}
                        disabled={actionLoading}
                        onChange={async (e) => {
                          const newDecision = e.target.value as any;
                          setBox((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              items: prev.items.map((it) => (it.id === item.id ? { ...it, decision: newDecision } : it)),
                            };
                          });
                          try {
                            await updateBoxItem(box.id, item.id, { decision: newDecision });
                            showToast('success', `Item decision updated to ${newDecision}`);
                          } catch (err) {
                            showToast('error', err instanceof Error ? err.message : 'Failed to update decision');
                            await load();
                          }
                        }}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize cursor-pointer border-0 shadow-2xs focus:ring-1 focus:ring-black ${DECISION_COLORS[item.decision] ?? ''}`}
                      >
                        <option value="pending">Decision: Pending</option>
                        <option value="keep">Decision: Keep</option>
                        <option value="return">Decision: Return</option>
                        <option value="rent">Decision: Rent</option>
                      </select>
                    </div>

                    {/* Two Checkpoint Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Checkpoint 1: Received from Brand */}
                      <QcCheckpointCard
                        title="1. Received from Brand"
                        description="Inspection on arrival from brand prior to box packing."
                        status={qcData.brand.status}
                        initialNotes={qcData.brand.notes}
                        initialImages={qcData.brand.images}
                        checkpoint="brand"
                        itemId={item.id}
                        isLocked={false}
                        onUpdate={(result, notes, images) => {
                          setBox((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              items: prev.items.map((it) => {
                                if (it.id !== item.id) return it;
                                const parsed = parseItemQc(it.qc_notes, it.qc_status);
                                const updatedState = {
                                  brand: { status: result, notes, images },
                                  customer: parsed.customer,
                                };
                                return {
                                  ...it,
                                  qc_notes: JSON.stringify(updatedState),
                                  qc_status: (parsed.customer.status !== 'pending' ? parsed.customer.status : result) as 'pending' | 'passed' | 'failed' | null,
                                };
                              }),
                            };
                          });
                        }}
                        showToast={showToast}
                      />

                      {/* Checkpoint 2: Picked from Customer */}
                      <QcCheckpointCard
                        title="2. Picked from Customer"
                        description="Inspection after return or rental period end."
                        status={isCustomerPickupUnlocked ? qcData.customer.status : 'locked'}
                        initialNotes={qcData.customer.notes}
                        initialImages={qcData.customer.images}
                        checkpoint="customer"
                        itemId={item.id}
                        isLocked={!isCustomerPickupUnlocked}
                        onUpdate={(result, notes, images) => {
                          setBox((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              items: prev.items.map((it) => {
                                if (it.id !== item.id) return it;
                                const parsed = parseItemQc(it.qc_notes, it.qc_status);
                                const updatedState = {
                                  brand: parsed.brand,
                                  customer: { status: result, notes, images },
                                };
                                return {
                                  ...it,
                                  qc_notes: JSON.stringify(updatedState),
                                  qc_status: result as 'pending' | 'passed' | 'failed' | null,
                                };
                              }),
                            };
                          });
                        }}
                        showToast={showToast}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

interface QcCheckpointCardProps {
  title: string;
  description: string;
  status: string;
  initialNotes: string;
  initialImages: string[];
  checkpoint: 'brand' | 'customer';
  itemId: string;
  isLocked: boolean;
  onUpdate: (result: 'passed' | 'failed', notes: string, images: string[]) => void;
  showToast: (type: 'success' | 'error', msg: string) => void;
}

function QcCheckpointCard({
  title,
  description,
  status,
  initialNotes,
  initialImages,
  checkpoint,
  itemId,
  isLocked,
  onUpdate,
  showToast,
}: QcCheckpointCardProps) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [notes, setNotes] = useState(initialNotes);
  const [images, setImages] = useState<string[]>(initialImages);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const dataUrl = await promise;
      newImages.push(dataUrl);
    }
    setImages((prev) => [...prev, ...newImages]);
    e.target.value = '';
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(result: 'passed' | 'failed') {
    setSubmitting(result);
    const prevStatus = currentStatus;
    setCurrentStatus(result); // Instant optimistic in-place UI update!
    onUpdate(result, notes, images);

    try {
      await request(`/api/admin/returns/items/${itemId}/qc`, {
        method: 'POST',
        body: JSON.stringify({
          checkpoint,
          result,
          notes,
          images,
        }),
      });
      showToast('success', `${title} marked ${result === 'passed' ? 'Pass' : 'Fail'}`);
    } catch (err) {
      setCurrentStatus(prevStatus); // rollback on error
      showToast('error', err instanceof Error ? err.message : 'QC update failed');
    } finally {
      setSubmitting(null);
    }
  }

  const isPassed = currentStatus === 'passed';
  const isFailed = currentStatus === 'failed';

  return (
    <div
      className={`rounded-lg border p-3 space-y-3 transition-colors ${
        isLocked ? 'border-neutral-200 bg-neutral-100 opacity-60' : 'border-neutral-200 bg-neutral-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-800">{title}</span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
            isPassed ? 'bg-green-100 text-green-700' :
            isFailed ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700'
          }`}
        >
          {currentStatus}
        </span>
      </div>

      {isLocked ? (
        <p className="text-xs text-neutral-400 italic">Locked until customer return/rental pickup is confirmed.</p>
      ) : (
        <>
          <p className="text-xs text-neutral-500">{description}</p>

          {/* Condition Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-neutral-600">Condition Notes</label>
            <input
              type="text"
              placeholder="Add inspection notes (e.g. slight stain on sleeve, zipper intact)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          {/* QC Inspection Photos */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-neutral-600">
                QC Inspection Photos ({images.length})
              </label>
              <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-black bg-white border border-neutral-300 px-2 py-1 rounded shadow-xs">
                <span>📷 Add Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Photos Preview Grid */}
            {images.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {images.map((imgUrl, idx) => (
                  <div key={idx} className="relative group w-14 h-14 rounded border border-neutral-200 overflow-hidden bg-white shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt={`QC photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-600 transition-colors"
                      title="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-neutral-400 italic">No QC photos attached yet.</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              disabled={submitting !== null}
              onClick={() => handleSave('passed')}
              className={`flex-1 text-xs font-semibold py-1.5 px-3 rounded transition-all cursor-pointer ${
                isPassed
                  ? 'bg-green-700 text-white ring-2 ring-green-500 shadow-xs'
                  : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
              }`}
            >
              {submitting === 'passed' ? 'Saving…' : '✓ Pass'}
            </button>
            <button
              disabled={submitting !== null}
              onClick={() => handleSave('failed')}
              className={`flex-1 text-xs font-semibold py-1.5 px-3 rounded transition-all cursor-pointer ${
                isFailed
                  ? 'bg-red-700 text-white ring-2 ring-red-500 shadow-xs'
                  : 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50'
              }`}
            >
              {submitting === 'failed' ? 'Saving…' : '✕ Fail'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
