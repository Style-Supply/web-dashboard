'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Categories } from '@/lib/taxonomy-api';
import { useToast } from '@/components/ui/Toast';
import { invalidateTaxonomyCache } from '@/hooks/useTaxonomy';
import type { Category, CategoryTreeNode } from '@/types/taxonomy';

/* ─── Helpers ──────────────────────────────────────────────── */
function countAllNodes(tree: CategoryTreeNode[]): { l1: number; l2: number; l3: number; total: number } {
  let l1 = 0;
  let l2 = 0;
  let l3 = 0;

  function traverse(node: CategoryTreeNode) {
    if (node.level === 1) l1++;
    else if (node.level === 2) l2++;
    else if (node.level === 3) l3++;

    for (const child of node.children ?? []) {
      traverse(child);
    }
  }

  for (const root of tree) traverse(root);
  return { l1, l2, l3, total: l1 + l2 + l3 };
}

/* ─── Category Drawer ──────────────────────────────────────── */
interface DrawerState {
  open: boolean;
  category: Partial<Category> | null;
  parent: CategoryTreeNode | null;
  level: 1 | 2 | 3;
  isNew: boolean;
}

interface CategoryDrawerProps {
  state: DrawerState;
  onClose: () => void;
  onSave: (cat: Partial<Category>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function CategoryDrawer({ state, onClose, onSave, onDelete }: CategoryDrawerProps) {
  const [draft, setDraft] = useState<Partial<Category>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (state.open) {
      setDraft(state.category ?? { name: '', slug: '', sort_order: 0 });
      setShowDeleteConfirm(false);
    }
  }, [state.open, state.category]);

  if (!state.open) return null;

  async function handleSave() {
    if (!draft.name?.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...draft,
        level: state.level,
        parent_id: state.parent?.id ?? state.category?.parent_id ?? null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!state.category?.id || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(state.category.id);
      onClose();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white font-bold text-xs">
              L{state.level}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {state.isNew
                  ? `Add Level ${state.level} Category`
                  : `Edit ${state.category?.name}`}
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                {state.parent ? `Parent: ${state.parent.name}` : 'Root Category'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!state.isNew && onDelete && !showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 hover:text-red-200 transition-colors"
              >
                Delete
              </button>
            )}
            {showDeleteConfirm && (
              <div className="flex items-center gap-2 rounded-lg bg-red-900/40 px-3 py-1.5">
                <span className="text-xs text-red-200">Delete category?</span>
                <button
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="rounded px-2 py-0.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Yes'}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-white/50 hover:text-white">
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {state.parent && (
            <div className="rounded-xl border border-neutral-200 bg-[#FDF8F4] p-3 text-xs">
              <span className="text-neutral-500">Parent Category: </span>
              <span className="font-semibold text-[#7A021D]">{state.parent.name}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              value={draft.name ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
              placeholder="e.g. Dresses"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Slug</label>
            <input
              value={draft.slug ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
              placeholder="e.g. dresses (auto-generated if empty)"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Sort Order</label>
            <input
              type="number"
              value={draft.sort_order ?? 0}
              onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
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
            onClick={() => void handleSave()}
            disabled={saving || !draft.name?.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#7A021D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : state.isNew ? 'Create Category' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Main Categories Page ─────────────────────────────────── */
export default function CategoriesPage() {
  const { showToast } = useToast();
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  // Expansion state: set of category IDs that are expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Drawer state
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    category: null,
    parent: null,
    level: 1,
    isNew: true,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { tree } = await Categories.tree();
      setTree(tree);
      // Auto expand L1 & L2 by default on initial load
      const initExpanded = new Set<string>();
      for (const l1 of tree) {
        initExpanded.add(l1.id);
        for (const l2 of l1.children ?? []) {
          initExpanded.add(l2.id);
        }
      }
      setExpanded(initExpanded);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const stats = useMemo(() => countAllNodes(tree), [tree]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    const next = new Set<string>();
    function addNodes(nodes: CategoryTreeNode[]) {
      for (const n of nodes) {
        next.add(n.id);
        if (n.children?.length) addNodes(n.children);
      }
    }
    addNodes(tree);
    setExpanded(next);
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  // Drawer triggers
  function openAdd(parent: CategoryTreeNode | null = null, level: 1 | 2 | 3 = 1) {
    setDrawer({
      open: true,
      category: null,
      parent,
      level,
      isNew: true,
    });
  }

  function openEdit(cat: CategoryTreeNode) {
    setDrawer({
      open: true,
      category: cat,
      parent: null,
      level: cat.level,
      isNew: false,
    });
  }

  function closeDrawer() {
    setDrawer((prev) => ({ ...prev, open: false }));
  }

  async function handleSave(patch: Partial<Category>) {
    try {
      if (drawer.isNew) {
        await Categories.create(patch);
        showToast('success', 'Category created');
      } else if (drawer.category?.id) {
        await Categories.update(drawer.category.id, patch);
        showToast('success', 'Category updated');
      }
      invalidateTaxonomyCache();
      await refresh();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Operation failed');
    }
  }

  async function handleDelete(id: string) {
    try {
      await Categories.remove(id);
      invalidateTaxonomyCache();
      await refresh();
      showToast('success', 'Category deleted');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Delete failed');
    }
  }

  // Search Filter: matches node or any of its children
  function filterTree(nodes: CategoryTreeNode[], query: string): CategoryTreeNode[] {
    if (!query.trim()) return nodes;
    const lq = query.toLowerCase();

    return nodes.reduce<CategoryTreeNode[]>((acc, node) => {
      const matchSelf = node.name.toLowerCase().includes(lq) || node.slug.toLowerCase().includes(lq);
      const filteredChildren = filterTree(node.children ?? [], query);

      if (matchSelf || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren,
        });
      }
      return acc;
    }, []);
  }

  const displayedTree = useMemo(() => filterTree(tree, q), [tree, q]);

  return (
    <>
      <div className="min-h-full bg-neutral-50 p-6">
        {/* ── Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2C0505]">Categories</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {loading ? 'Loading taxonomy…' : `${stats.l1} Main · ${stats.l2} Sub · ${stats.l3} Leaf (${stats.total} total)`}
            </p>
          </div>
          <button
            onClick={() => openAdd(null, 1)}
            className="flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Root Category
          </button>
        </div>

        {/* ── Toolbar ── */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search categories…"
              className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D]/30 focus:border-[#7A021D] transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors shadow-sm"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors shadow-sm"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* ── Loading Skeleton ── */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Empty State ── */}
        {!loading && displayedTree.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
              <svg className="w-7 h-7 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-700">No categories found</p>
            <p className="mt-1 text-xs text-neutral-400">Add a root category to build your taxonomy</p>
            <button
              onClick={() => openAdd(null, 1)}
              className="mt-4 flex items-center gap-2 rounded-xl bg-[#7A021D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a0115] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Root Category
            </button>
          </div>
        )}

        {/* ── Category Tree View ── */}
        {!loading && displayedTree.length > 0 && (
          <div className="space-y-4">
            {displayedTree.map((root) => (
              <RootCategoryCard
                key={root.id}
                node={root}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                onAddChild={(parent, level) => openAdd(parent, level)}
                onEditNode={openEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Category Drawer ── */}
      <CategoryDrawer
        state={drawer}
        onClose={closeDrawer}
        onSave={handleSave}
        onDelete={handleDelete}
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

/* ─── Level 1 Root Category Card Component ──────────────────── */
function RootCategoryCard({
  node,
  expanded,
  onToggleExpand,
  onAddChild,
  onEditNode,
}: {
  node: CategoryTreeNode;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onAddChild: (parent: CategoryTreeNode, level: 2 | 3) => void;
  onEditNode: (cat: CategoryTreeNode) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const childrenCount = node.children?.length ?? 0;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden transition-all duration-200">
      {/* Root Header */}
      <div className="flex items-center justify-between bg-[#2C0505] px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleExpand(node.id)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{node.name}</h2>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-white/80 uppercase">
                Level 1
              </span>
            </div>
            <p className="text-xs text-white/50 font-mono mt-0.5">{node.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60 font-medium mr-2">
            {childrenCount} Subcategor{childrenCount !== 1 ? 'ies' : 'y'}
          </span>

          <button
            onClick={() => onAddChild(node, 2)}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Subcategory
          </button>

          <button
            onClick={() => onEditNode(node)}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Edit Category"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Children Section (Level 2) */}
      {isExpanded && (
        <div className="p-4 bg-neutral-50/50 space-y-3">
          {childrenCount === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center">
              <p className="text-xs text-neutral-500 font-medium">No subcategories in {node.name}</p>
              <button
                onClick={() => onAddChild(node, 2)}
                className="mt-2 text-xs font-semibold text-[#7A021D] hover:underline"
              >
                + Add first subcategory
              </button>
            </div>
          ) : (
            node.children.map((subNode) => (
              <SubCategoryCard
                key={subNode.id}
                node={subNode}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                onAddChild={onAddChild}
                onEditNode={onEditNode}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Level 2 Subcategory Card Component ─────────────────────── */
function SubCategoryCard({
  node,
  expanded,
  onToggleExpand,
  onAddChild,
  onEditNode,
}: {
  node: CategoryTreeNode;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onAddChild: (parent: CategoryTreeNode, level: 2 | 3) => void;
  onEditNode: (cat: CategoryTreeNode) => void;
}) {
  const isExpanded = expanded.has(node.id);
  const leafCount = node.children?.length ?? 0;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {/* Level 2 Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#FDF8F4]/70 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onToggleExpand(node.id)}
            className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200/60 transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="h-2 w-2 rounded-full bg-[#7A021D]" />
          <h3 className="text-sm font-semibold text-[#2C0505]">{node.name}</h3>
          <span className="text-xs font-mono text-neutral-400">/{node.slug}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[#7A021D] bg-[#FDF8F4] border border-[#7A021D]/20 px-2 py-0.5 rounded-full">
            {leafCount} Item{leafCount !== 1 ? 's' : ''}
          </span>

          <button
            onClick={() => onAddChild(node, 3)}
            className="flex items-center gap-1 rounded-md bg-[#7A021D] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#5a0115] transition-colors"
          >
            + Add Item
          </button>

          <button
            onClick={() => onEditNode(node)}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-[#7A021D]"
            title="Edit Subcategory"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Level 3 Leaf Items */}
      {isExpanded && (
        <div className="p-3 bg-white">
          {leafCount === 0 ? (
            <p className="text-xs text-neutral-400 italic py-1 px-2">No items added yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {node.children.map((leaf) => (
                <div
                  key={leaf.id}
                  className="group flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-[#7A021D]/30 hover:bg-[#FDF8F4] transition-all"
                >
                  <span>{leaf.name}</span>
                  <span className="text-[10px] font-mono text-neutral-400">({leaf.slug})</span>

                  <button
                    onClick={() => onEditNode(leaf)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-[#7A021D] transition-opacity"
                    title="Edit Item"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
