'use client';

import { useCallback, useEffect, useState } from 'react';
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

function formatRupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function CodesPage(): React.ReactElement {
  const { showToast } = useToast();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listCodes();
      setCodes(result.codes);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  function openCreate(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
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
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
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
        showToast('success', 'Code updated');
      } else {
        await createCode(payload);
        showToast('success', 'Code created');
      }
      setShowForm(false);
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('Delete this code?')) return;
    try {
      await deleteCode(id);
      showToast('success', 'Code deleted');
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2C0505]">Access Codes</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-[#FDF8F4] hover:text-[#7A021D] disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7A021D] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#6B0019]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Code
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Uses</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-400">Loading...</td></tr>
            ) : codes.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-400">No codes yet</td></tr>
            ) : codes.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                <td className="px-4 py-3">{TYPE_LABELS[c.type]}</td>
                <td className="px-4 py-3">{c.grants_access ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatRupees(c.discount_minor)}</td>
                <td className="px-4 py-3 text-xs">
                  {c.used_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ''}
                </td>
                <td className="px-4 py-3 text-xs">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                  <button onClick={() => openEdit(c)} className="text-xs font-medium text-[#7A021D] hover:underline">Edit</button>
                  <button onClick={() => void handleDelete(c.id)} className="text-xs font-medium text-red-700 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#2C0505]">{editingId ? 'Edit Code' : 'Create Code'}</h2>
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-700">Code</span>
                <input
                  required
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm uppercase focus:border-[#7A021D] focus:outline-none focus:ring-1 focus:ring-[#7A021D]"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-700">Type</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as AccessCodeType })}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.grants_access}
                  onChange={(e) => setForm({ ...form, grants_access: e.target.checked })}
                />
                <span className="text-neutral-700">Grants access (skips waitlist)</span>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-700">Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.discount_rupees}
                  onChange={(e) => setForm({ ...form, discount_rupees: e.target.value })}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-700">Max uses (blank = unlimited)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-700">Expires (blank = never)</span>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-[#FDF8F4]">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-[#7A021D] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#6B0019] disabled:opacity-50">
                  {submitting ? 'Saving…' : editingId ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
