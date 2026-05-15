'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { listFaqEntries, createFaqEntry, updateFaqEntry, deleteFaqEntry } from '@/lib/faq';
import type { FaqEntry } from '@/types/faq';

interface FormState {
  question: string;
  answer: string;
  category: string;
  sort_order: string;
  published: boolean;
}

const EMPTY_FORM: FormState = {
  question: '',
  answer: '',
  category: 'general',
  sort_order: '0',
  published: true,
};

export default function FaqPage(): React.ReactElement {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listFaqEntries();
      setEntries(result.entries);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const categories = Array.from(new Set(entries.map((e) => e.category))).sort();
  const filteredEntries = categoryFilter
    ? entries.filter((e) => e.category === categoryFilter)
    : entries;

  function openCreate(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(entry: FaqEntry): void {
    setEditingId(entry.id);
    setForm({
      question: entry.question,
      answer: entry.answer,
      category: entry.category,
      sort_order: entry.sort_order.toString(),
      published: entry.published,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category.trim() || 'general',
        sort_order: Number(form.sort_order || 0),
        published: form.published,
      };
      if (editingId) {
        await updateFaqEntry(editingId, payload);
        showToast('success', 'FAQ updated');
      } else {
        await createFaqEntry(payload);
        showToast('success', 'FAQ created');
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
    if (!confirm('Delete this FAQ entry?')) return;
    try {
      await deleteFaqEntry(id);
      showToast('success', 'FAQ deleted');
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function togglePublished(entry: FaqEntry): Promise<void> {
    try {
      await updateFaqEntry(entry.id, { published: !entry.published });
      showToast('success', !entry.published ? 'Published' : 'Unpublished');
      void load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Update failed');
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2C0505]">FAQ</h1>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
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
            New Entry
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3 w-16">Order</th>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Loading...</td></tr>
            ) : filteredEntries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No FAQ entries</td></tr>
            ) : filteredEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-mono text-xs">{entry.sort_order}</td>
                <td className="px-4 py-3 max-w-xl">
                  <div className="font-medium text-[#2C0505]">{entry.question}</div>
                  <div className="mt-1 text-xs text-neutral-500 line-clamp-2">{entry.answer}</div>
                </td>
                <td className="px-4 py-3 text-xs">{entry.category}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => void togglePublished(entry)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      entry.published ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {entry.published ? 'Published' : 'Draft'}
                  </button>
                </td>
                <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                  <button onClick={() => openEdit(entry)} className="text-xs font-medium text-[#7A021D] hover:underline">Edit</button>
                  <button onClick={() => void handleDelete(entry.id)} className="text-xs font-medium text-red-700 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl rounded-lg border border-neutral-200 bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-[#2C0505]">{editingId ? 'Edit FAQ' : 'New FAQ'}</h2>
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-700">Question</span>
                <input
                  required
                  type="text"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-[#7A021D] focus:outline-none focus:ring-1 focus:ring-[#7A021D]"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-700">Answer</span>
                <textarea
                  required
                  rows={6}
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-[#7A021D] focus:outline-none focus:ring-1 focus:ring-[#7A021D]"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-neutral-700">Category</span>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-neutral-700">Sort order</span>
                  <input
                    type="number"
                    step="1"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />
                <span className="text-neutral-700">Published</span>
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
