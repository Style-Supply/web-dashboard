'use client';

import { useEffect, useState } from 'react';
import { Collections, Looks } from '@/lib/taxonomy-api';
import type { Collection, Look } from '@/types/taxonomy';
import { invalidateTaxonomyCache } from '@/hooks/useTaxonomy';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [looksByCol, setLooksByCol] = useState<Record<string, Look[]>>({});
  const [draft, setDraft] = useState<{ name?: string }>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const { showToast } = useToast();

  async function refresh() {
    const { items } = await Collections.list();
    setCollections(items);
  }

  async function refreshLooks(collectionId: string) {
    const { items } = await Looks.listFor(collectionId);
    setLooksByCol((s) => ({ ...s, [collectionId]: items }));
  }

  useEffect(() => { refresh(); }, []);

  async function addCollection() {
    if (!draft.name) return;
    try {
      await Collections.create({ name: draft.name });
      setDraft({});
      invalidateTaxonomyCache();
      await refresh();
      showToast('success', 'Collection added');
    } catch (e) { showToast('error', e instanceof Error ? e.message : 'Failed'); }
  }

  async function deleteCollection(id: string) {
    if (!confirm('Delete this collection (and its looks)?')) return;
    try {
      await Collections.remove(id);
      invalidateTaxonomyCache();
      await refresh();
    } catch (e) { showToast('error', e instanceof Error ? e.message : 'Failed'); }
  }

  async function addLook(collectionId: string, name: string) {
    if (!name) return;
    try {
      await Looks.create({ collection_id: collectionId, name });
      invalidateTaxonomyCache();
      await refreshLooks(collectionId);
    } catch (e) { showToast('error', e instanceof Error ? e.message : 'Failed'); }
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">Collections</h1>
      <div className="flex gap-2">
        <Input value={draft.name ?? ''} onChange={(e) => setDraft({ name: e.target.value })} placeholder="New collection name" />
        <Button onClick={addCollection}>Add</Button>
      </div>

      <div className="space-y-3">
        {collections.map((c) => (
          <div key={c.id} className="rounded border border-neutral-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <button className="text-left font-medium" onClick={() => { const next = openId === c.id ? null : c.id; setOpenId(next); if (next && !looksByCol[next]) refreshLooks(next); }}>
                {openId === c.id ? '▾ ' : '▸ '}{c.name}
              </button>
              <Button size="sm" variant="ghost" onClick={() => deleteCollection(c.id)}>Delete</Button>
            </div>
            {openId === c.id && (
              <div className="border-t border-neutral-100 p-4">
                <ul className="space-y-1 mb-3">
                  {(looksByCol[c.id] ?? []).map((l) => (
                    <li key={l.id} className="flex items-center justify-between text-sm">
                      <span>{l.name}</span>
                      <button className="text-neutral-500 hover:text-red-600" onClick={async () => {
                        if (!confirm('Delete this look?')) return;
                        await Looks.remove(l.id);
                        await refreshLooks(c.id);
                      }}>Delete</button>
                    </li>
                  ))}
                </ul>
                <LookAdder onAdd={(name) => addLook(c.id, name)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LookAdder({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div className="flex gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="New look name" />
      <Button size="sm" onClick={() => { onAdd(v); setV(''); }}>Add look</Button>
    </div>
  );
}
