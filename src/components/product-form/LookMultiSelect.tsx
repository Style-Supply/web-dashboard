'use client';

import { useState } from 'react';
import type { Collection } from '@/types/taxonomy';

export interface LookMultiSelectProps {
  value: string[];
  collections: Collection[];
  onChange: (lookIds: string[]) => void;
}

export default function LookMultiSelect({ value, collections, onChange }: LookMultiSelectProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const allLooks = collections.flatMap((c) => (c.looks ?? []).map((l) => ({ ...l, collection: c })));
  const selected = allLooks.filter((l) => value.includes(l.id));

  function toggle(lookId: string) {
    onChange(value.includes(lookId) ? value.filter((v) => v !== lookId) : [...value, lookId]);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selected.length === 0 && <span className="text-sm text-neutral-400">No looks selected</span>}
        {selected.map((l) => (
          <span key={l.id} className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs">
            <span className="text-neutral-500">{l.collection.name} /</span>
            <span>{l.name}</span>
            <button type="button" onClick={() => toggle(l.id)} className="text-neutral-400 hover:text-red-600">×</button>
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded border border-dashed border-neutral-300 px-3 py-1.5 text-sm hover:border-neutral-400"
      >
        {open ? 'Close' : '+ Add looks'}
      </button>
      {open && (
        <div className="rounded border border-neutral-200 bg-white p-3">
          {collections.length === 0 && <p className="text-sm text-neutral-400">No collections yet.</p>}
          {collections.map((c) => (
            <div key={c.id} className="mb-3">
              <p className="mb-1 text-xs font-semibold text-neutral-500">{c.name}</p>
              <div className="flex flex-wrap gap-2">
                {(c.looks ?? []).length === 0 && <span className="text-xs text-neutral-400">No looks</span>}
                {(c.looks ?? []).map((l) => {
                  const on = value.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggle(l.id)}
                      className={`rounded-full border px-3 py-1 text-xs ${on ? 'border-black bg-black text-white' : 'border-neutral-200 hover:border-neutral-400'}`}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
