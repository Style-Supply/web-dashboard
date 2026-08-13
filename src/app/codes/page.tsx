'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { listCodes, createCode, updateCode, deleteCode } from '@/lib/codes';
import type { AccessCode, AccessCodeType } from '@/types/code';

interface FormState {
  code: string;
  type: AccessCodeType;
  grants_access: boolean;
  discount_rupees: string;
  max_uses: string;
  expires_at: string;
}

const EMPTY_FORM: FormState = {
  code: '',
  type: 'invite',
  grants_access: true,
  discount_rupees: '0',
  max_uses: '',
  expires_at: '',
};

const TYPE_LABELS: Record<AccessCodeType, string> = {
  invite: 'Invite',
  promo: 'Promo',
  both: 'Invite + Promo',
};

const TYPE_COLORS: Record<AccessCodeType, string> = {
  invite: 'bg-[#FDF8F4] text-[#7A021D] border-[#7A021D]/20',
  promo: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  both: 'bg-amber-50 text-amber-800 border-amber-200',
};

function formatRupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function generateRandomAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SS-${pick(4)}-${pick(4)}`;
}

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

export default function CodesPage(): React.ReactElement {
  const { showToast } = useToast();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [view, setView] = useState<'grid' | 'list'>('list');

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listCodes();
      setCodes(result.codes);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load access codes');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const filteredCodes = useMemo(() => {
    return codes.filter((c) => {
      const matchesType = !typeFilter || c.type === typeFilter;
      const matchesSearch = !search.trim() || c.code.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [codes, typeFilter, search]);

  // KPI Metrics
  const totalUses = useMemo(() => codes.reduce((acc, c) => acc + (c.used_count || 0), 0), [codes]);
  const inviteCount = useMemo(() => codes.filter((c) => c.grants_access).length, [codes]);
  const promoCount = useMemo(() => codes.filter((c) => c.discount_minor > 0).length, [codes]);

  function openCreate(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowDrawer(true);
  }

  function openEdit(code: AccessCode): void {
    setEditingId(code.id);
    setForm({
      code: code.code,
      type: code.type,
      grants_access: code.grants_access,
      discount_rupees: (code.discount_minor / 100).toString(),
      max_uses: code.max_uses?.toString() ?? '',
      expires_at: code.expires_at ? code.expires_at.slice(0, 10) : '',
    });
    setShowDrawer(true);
  }

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text);
    showToast('success', `Copied "${text}" to clipboard`);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.code.trim()) {
      showToast('error', 'Code string is required');
      return;
    }

    setSubmitting(true);
    try {
      const discount_minor = Math.round(Number(form.discount_rupees || 0) * 100);
      const max_uses = form.max_uses === '' ? null : Number(form.max_uses);
      const expires_at = form.expires_at === '' ? null : new Date(form.expires_at).toISOString();
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        grants_access: form.grants_access,
        discount_minor,
        max_uses,
        expires_at,
      };

      if (editingId) {
        await updateCode(editingId, payload);
        showToast('success', 'Access code updated');
      } else {
        await createCode(payload);
        showToast('success', 'Access code created');
      }
      setShowDrawer(false);
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, codeName: string): Promise<void> {
    if (!confirm(`Delete access code "${codeName}"?`)) return;
    setDeletingId(id);
    try {
      await deleteCode(id);
      showToast('success', 'Code deleted');
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  const TYPE_TABS = [
    { id: '', label: 'All Codes' },
    { id: 'invite', label: 'Invite Only' },
    { id: 'promo', label: 'Promo Discount' },
    { id: 'both', label: 'Invite + Promo' },
  ];

  return (
    <>
      <div className="min-h-full bg-neutral-50 p-6">
        {/* ── Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2C0505]">Referral &amp; Promo Codes</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              Manage referral codes, discount vouchers, and member access passes
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 shadow-xs"
            >
              <svg
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all shadow-md hover:shadow-lg"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Referral Code
            </button>
          </div>
        </div>

        {/* ── KPI Summary Cards ── */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Codes</p>
            <p className="mt-2 text-2xl font-extrabold text-[#2C0505]">{codes.length}</p>
            <p className="mt-1 text-xs text-neutral-500">Configured vouchers & passes</p>
          </div>
          <div className="rounded-2xl border border-[#7A021D]/20 bg-[#FDF8F4] p-5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7A021D]">Referral &amp; Invite Codes</p>
            <p className="mt-2 text-2xl font-extrabold text-[#7A021D]">{inviteCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Grant waitlist bypass access</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Promo Vouchers</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-900">{promoCount}</p>
            <p className="mt-1 text-xs text-emerald-600">Discounts & credit bonuses</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Total Redeemed</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-900">{totalUses}</p>
            <p className="mt-1 text-xs text-amber-600">Times codes used by members</p>
          </div>
        </div>

        {/* ── Toolbar: Type Tabs & Search ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* Type Filter Tabs */}
          <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-xs">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  typeFilter === tab.id
                    ? 'bg-[#7A021D] text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & View Switcher */}
          <div className="flex items-center gap-3">
            <div className="relative max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code string…"
                className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D]"
              />
            </div>

            <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1 shadow-xs">
              <button
                onClick={() => setView('grid')}
                title="Grid view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  view === 'grid' ? 'bg-[#FDF8F4] shadow-xs' : 'hover:bg-neutral-50'
                }`}
              >
                <IconGrid active={view === 'grid'} />
              </button>
              <button
                onClick={() => setView('list')}
                title="List view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  view === 'list' ? 'bg-[#FDF8F4] shadow-xs' : 'hover:bg-neutral-50'
                }`}
              >
                <IconList active={view === 'list'} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Skeleton Loading ── */}
        {loading && view === 'grid' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════
            GRID VIEW
        ══════════════════════════════════════ */}
        {!loading && filteredCodes.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCodes.map((c) => {
              const isExpired = c.expires_at ? new Date(c.expires_at).getTime() < Date.now() : false;
              const isMaxedOut = c.max_uses !== null && c.used_count >= c.max_uses;

              return (
                <div
                  key={c.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:shadow-md transition-all ${
                    deletingId === c.id ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <div>
                    {/* Code String & Type Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-[#2C0505] tracking-wider bg-neutral-100 px-3 py-1 rounded-xl border border-neutral-200">
                          {c.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(c.code)}
                          title="Copy Code"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-50 text-neutral-500 hover:bg-[#FDF8F4] hover:text-[#7A021D] transition-colors"
                        >
                          📋
                        </button>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          TYPE_COLORS[c.type]
                        }`}
                      >
                        {TYPE_LABELS[c.type]}
                      </span>
                    </div>

                    {/* Access & Discount Badge */}
                    <div className="mt-4 flex items-center gap-2">
                      {c.grants_access && (
                        <span className="rounded-lg bg-[#FDF8F4] px-2.5 py-1 text-xs font-bold text-[#7A021D] border border-[#7A021D]/20">
                          🔑 Grants Membership
                        </span>
                      )}
                      {c.discount_minor > 0 && (
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                          🏷️ {formatRupees(c.discount_minor)} Off
                        </span>
                      )}
                    </div>

                    {/* Usage Progress */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-neutral-500 font-medium">Redemption Usage</span>
                        <span className="font-bold text-[#2C0505]">
                          {c.used_count} {c.max_uses !== null ? `/ ${c.max_uses}` : 'uses (Unlimited)'}
                        </span>
                      </div>
                      {c.max_uses !== null && (
                        <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isMaxedOut ? 'bg-red-500' : 'bg-[#7A021D]'
                            }`}
                            style={{ width: `${Math.min(100, (c.used_count / c.max_uses) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Expiry & Status */}
                    <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                      <span>📅 Expires: {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : 'Never'}</span>
                      {isExpired ? (
                        <span className="font-bold text-red-600">Expired</span>
                      ) : isMaxedOut ? (
                        <span className="font-bold text-amber-600">Limit Reached</span>
                      ) : (
                        <span className="font-bold text-emerald-600">Active</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded-lg bg-neutral-100 px-3 py-1.5 font-semibold text-neutral-700 hover:bg-[#FDF8F4] hover:text-[#7A021D] transition-colors"
                    >
                      Edit Code
                    </button>
                    <button
                      onClick={() => void handleDelete(c.id, c.code)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════
            LIST TABLE VIEW
        ══════════════════════════════════════ */}
        {view === 'list' && (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50/80 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Grants Access</th>
                  <th className="px-5 py-3.5">Discount</th>
                  <th className="px-5 py-3.5">Redemption Uses</th>
                  <th className="px-5 py-3.5">Expires</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-neutral-400">Loading access codes…</td>
                  </tr>
                ) : filteredCodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-neutral-400">No access codes found</td>
                  </tr>
                ) : (
                  filteredCodes.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#2C0505] bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200">
                            {c.code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(c.code)}
                            title="Copy Code"
                            className="text-xs text-neutral-400 hover:text-[#7A021D]"
                          >
                            📋
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[c.type]}`}>
                          {TYPE_LABELS[c.type]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {c.grants_access ? (
                          <span className="font-bold text-emerald-700">Yes (Skips waitlist)</span>
                        ) : (
                          <span className="text-neutral-400">No</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-[#7A021D]">
                        {formatRupees(c.discount_minor)}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-neutral-700">
                        {c.used_count} {c.max_uses !== null ? `/ ${c.max_uses}` : '(Unlimited)'}
                      </td>
                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : 'Never'}
                      </td>
                      <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded-lg bg-[#FDF8F4] px-2.5 py-1 text-xs font-semibold text-[#7A021D] hover:bg-[#7A021D] hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void handleDelete(c.id, c.code)}
                          className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-Over Code Drawer Popup ── */}
      {showDrawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
            style={{ animation: 'slideInRight .22s ease-out' }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 bg-[#2C0505] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white font-bold text-sm">
                  🔑
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {editingId ? 'Edit Referral Code' : 'Create Referral Code'}
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">Configure invite permissions & discounts</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Form Body */}
            <form id="code-drawer-form" onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              {/* Code String with Auto Generator */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                    Code String *
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, code: generateRandomAccessCode() }))}
                    className="text-[11px] font-bold text-[#7A021D] hover:underline"
                  >
                    ⚡ Auto Generate
                  </button>
                </div>
                <input
                  required
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SS-A8K2-9P3X"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-mono font-bold uppercase text-[#2C0505] outline-none focus:border-[#7A021D]"
                />
              </div>

              {/* Code Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                  Code Purpose / Type *
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as AccessCodeType })}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-[#7A021D]"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Grants Access Checkbox */}
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-[#FDF8F4] p-3.5">
                <input
                  type="checkbox"
                  id="grants_access"
                  checked={form.grants_access}
                  onChange={(e) => setForm({ ...form, grants_access: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#7A021D]"
                />
                <label htmlFor="grants_access" className="text-xs font-bold text-[#2C0505] cursor-pointer">
                  Grants Access (Bypasses waitlist for registration)
                </label>
              </div>

              {/* Discount Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                  Discount Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.discount_rupees}
                    onChange={(e) => setForm({ ...form, discount_rupees: e.target.value })}
                    placeholder="0"
                    className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-8 pr-3 text-sm font-bold outline-none focus:border-[#7A021D]"
                  />
                </div>
              </div>

              {/* Max Uses */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                  Max Usage Limit (Blank = Unlimited)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="Unlimited"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-[#7A021D]"
                />
              </div>

              {/* Expiration Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#7A021D]">
                  Expiration Date (Blank = Never)
                </label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-[#7A021D]"
                />
              </div>
            </form>

            {/* Drawer Footer */}
            <div className="shrink-0 flex items-center justify-end gap-3 border-t border-neutral-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="code-drawer-form"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-5 py-2 text-xs font-bold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-all shadow-md"
              >
                {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Referral Code'}
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
      )}
    </>
  );
}
