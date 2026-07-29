'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { invalidateTaxonomyCache } from '@/hooks/useTaxonomy';

export interface TaxonomyField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'colour';
  required?: boolean;
}

export interface TaxonomyListPageProps<T extends { id: string }> {
  title: string;
  fields: TaxonomyField[];
  api: {
    list: (q?: string) => Promise<{ items: T[]; total: number }>;
    create: (b: Partial<T>) => Promise<T>;
    update: (id: string, b: Partial<T>) => Promise<T>;
    remove: (id: string) => Promise<void>;
  };
}

export default function TaxonomyListPage<T extends { id: string; name: string }>({
  title,
  fields,
  api,
}: TaxonomyListPageProps<T>): React.ReactElement {
  const [items, setItems] = useState<T[]>([]);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState<Partial<T>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  async function refresh() {
    setLoading(true);
    try {
      const { items } = await api.list(q || undefined);
      setItems(items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function handleSave() {
    try {
      if (editing) {
        await api.update(editing, draft);
      } else {
        await api.create(draft);
      }
      setDraft({});
      setEditing(null);
      invalidateTaxonomyCache();
      await refresh();
      showToast('success', 'Saved');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Save failed');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this row?')) return;
    try {
      await api.remove(id);
      invalidateTaxonomyCache();
      await refresh();
      showToast('success', 'Deleted');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search..."
        className="max-w-sm"
      />

      <div className="rounded border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              {fields.map((f) => (
                <th key={f.key} className="px-3 py-2">
                  {f.label}
                </th>
              ))}
              <th className="w-32 px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={fields.length + 1} className="px-3 py-2">
                  Loading...
                </td>
              </tr>
            )}
            {!loading &&
              items.map((row) => (
                <tr key={row.id} className="border-t border-neutral-100">
                  {fields.map((f) => (
                    <td key={f.key} className="px-3 py-2">
                      {editing === row.id ? (
                        f.type === 'colour' ? (
                          <input
                            type="color"
                            value={
                              (draft as Record<string, unknown>)[f.key] as string ??
                              (row as Record<string, unknown>)[f.key] as string
                            }
                            onChange={(e) =>
                              setDraft({ ...draft, [f.key]: e.target.value } as Partial<T>)
                            }
                          />
                        ) : (
                          <Input
                            type={f.type ?? 'text'}
                            value={
                              ((draft as Record<string, unknown>)[f.key] ??
                                (row as Record<string, unknown>)[f.key] ??
                                '') as string | number
                            }
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                [f.key]:
                                  f.type === 'number' ? Number(e.target.value) : e.target.value,
                              } as Partial<T>)
                            }
                          />
                        )
                      ) : f.type === 'colour' ? (
                        <span
                          className="inline-block h-4 w-4 rounded-full align-middle border border-neutral-200"
                          style={{
                            backgroundColor: (row as Record<string, unknown>)[f.key] as string,
                          }}
                        />
                      ) : (
                        <>{(row as Record<string, unknown>)[f.key]}</>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 space-x-1">
                    {editing === row.id ? (
                      <>
                        <Button size="sm" onClick={handleSave}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(null);
                            setDraft({});
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(row.id);
                            setDraft(row);
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            {!loading && editing === null && (
              <tr className="border-t border-neutral-100 bg-neutral-50">
                {fields.map((f) => (
                  <td key={f.key} className="px-3 py-2">
                    {f.type === 'colour' ? (
                      <input
                        type="color"
                        value={((draft as Record<string, unknown>)[f.key] as string) ?? '#000000'}
                        onChange={(e) =>
                          setDraft({ ...draft, [f.key]: e.target.value } as Partial<T>)
                        }
                      />
                    ) : (
                      <Input
                        type={f.type ?? 'text'}
                        value={((draft as Record<string, unknown>)[f.key] ?? '') as string | number}
                        placeholder={`New ${f.label}`}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                          } as Partial<T>)
                        }
                      />
                    )}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <Button size="sm" onClick={handleSave}>
                    Add
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
