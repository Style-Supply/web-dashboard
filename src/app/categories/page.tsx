'use client';

import { useEffect, useState } from 'react';
import { Categories } from '@/lib/taxonomy-api';
import type { CategoryTreeNode } from '@/types/taxonomy';
import { invalidateTaxonomyCache } from '@/hooks/useTaxonomy';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const { showToast } = useToast();

  async function refresh() {
    const { tree } = await Categories.tree();
    setTree(tree);
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd(parent: CategoryTreeNode | null, name: string, level: 1 | 2 | 3) {
    try {
      await Categories.create({ name, level, parent_id: parent?.id ?? null });
      invalidateTaxonomyCache();
      await refresh();
    } catch (e) { showToast('error', e instanceof Error ? e.message : 'Failed'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category?')) return;
    try {
      await Categories.remove(id);
      invalidateTaxonomyCache();
      await refresh();
    } catch (e) { showToast('error', e instanceof Error ? e.message : 'Failed'); }
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">Categories</h1>
      <div className="rounded border border-neutral-200 bg-white p-4 space-y-3">
        {tree.map((root) => (
          <Node key={root.id} node={root} onAdd={handleAdd} onDelete={handleDelete} />
        ))}
        <AddRow level={1} onAdd={(name) => handleAdd(null, name, 1)} />
      </div>
    </div>
  );
}

function Node({ node, onAdd, onDelete }: { node: CategoryTreeNode; onAdd: (parent: CategoryTreeNode, name: string, level: 1 | 2 | 3) => void; onDelete: (id: string) => void; }) {
  const childLevel = (node.level + 1) as 2 | 3;
  return (
    <div className="ml-2">
      <div className="flex items-center justify-between py-1">
        <span className="font-medium">{node.name} <span className="text-xs text-neutral-400">L{node.level}</span></span>
        <button className="text-xs text-neutral-500 hover:text-red-600" onClick={() => onDelete(node.id)}>Delete</button>
      </div>
      <div className="ml-4 space-y-1">
        {node.children.map((c) => <Node key={c.id} node={c} onAdd={onAdd} onDelete={onDelete} />)}
        {node.level < 3 && <AddRow level={childLevel} onAdd={(name) => onAdd(node, name, childLevel)} />}
      </div>
    </div>
  );
}

function AddRow({ level, onAdd }: { level: 1 | 2 | 3; onAdd: (name: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div className="flex gap-2 pt-1">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={`Add level-${level}`} />
      <Button size="sm" onClick={() => { onAdd(v); setV(''); }}>Add</Button>
    </div>
  );
}
