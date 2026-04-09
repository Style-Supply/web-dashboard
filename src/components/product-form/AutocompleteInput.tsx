'use client';

import { useRef, useState } from 'react';
import type { SuggestionField } from '@/types/product';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import Input from '@/components/ui/Input';

interface AutocompleteInputProps {
  field: SuggestionField;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function AutocompleteInput({
  field,
  value,
  onChange,
  placeholder,
}: AutocompleteInputProps): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { suggestions, loading } = useAutocomplete(field, value);

  const commit = (v: string): void => {
    onChange(v);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (highlight >= 0) {
        e.preventDefault();
        commit(suggestions[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={onKeyDown}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-neutral-200 bg-white shadow">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={`cursor-pointer px-3 py-1.5 text-sm ${i === highlight ? 'bg-neutral-100' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(s);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
      {loading && <div className="absolute right-2 top-2 text-xs text-neutral-400">…</div>}
    </div>
  );
}
