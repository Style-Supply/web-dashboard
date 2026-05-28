'use client';

import { useEffect, useRef, useState } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  hint?: string;
  swatch?: string;
}

export interface DropdownSelectProps {
  value: string | null;
  options: DropdownOption[];
  placeholder?: string;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  allowClear?: boolean;
}

export default function DropdownSelect({
  value, options, placeholder = 'Select…', onChange, disabled = false, allowClear = true,
}: DropdownSelectProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded border border-neutral-200 bg-white px-3 py-2 text-sm hover:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-400"
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.swatch && <span className="inline-block h-3 w-3 rounded-full border border-neutral-200" style={{ backgroundColor: selected.swatch }} />}
          {selected ? selected.label : <span className="text-neutral-400">{placeholder}</span>}
        </span>
        <span className="ml-2 text-neutral-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded border border-neutral-200 bg-white shadow-lg">
          <div className="border-b border-neutral-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-auto py-1">
            {allowClear && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); setQuery(''); }}
                className="flex w-full items-center px-3 py-1.5 text-left text-sm text-neutral-500 hover:bg-neutral-50"
              >
                — Clear —
              </button>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-50 ${o.value === value ? 'bg-neutral-50' : ''}`}
              >
                {o.swatch && <span className="inline-block h-3 w-3 rounded-full border border-neutral-200" style={{ backgroundColor: o.swatch }} />}
                <span className="flex-1 truncate">{o.label}</span>
                {o.hint && <span className="text-xs text-neutral-400">{o.hint}</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-neutral-400">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
