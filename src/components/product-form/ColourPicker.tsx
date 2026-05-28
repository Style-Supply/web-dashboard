'use client';

import { useState } from 'react';
import type { Colour } from '@/types/taxonomy';

export interface ColourPickerValue {
  colour_id: string | null;
  custom_colour: string | null;
}

export interface ColourPickerProps {
  value: ColourPickerValue;
  colours: Colour[];
  onChange: (v: ColourPickerValue) => void;
}

export default function ColourPicker({ value, colours, onChange }: ColourPickerProps): React.ReactElement {
  const [otherActive, setOtherActive] = useState(value.custom_colour !== null);

  function pick(id: string) {
    setOtherActive(false);
    onChange({ colour_id: id, custom_colour: null });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {colours.map((c) => {
          const on = value.colour_id === c.id;
          return (
            <button
              key={c.id}
              type="button"
              title={c.name}
              onClick={() => pick(c.id)}
              className={`relative h-7 w-7 rounded-full border ${on ? 'border-black ring-2 ring-black' : 'border-neutral-300'}`}
              style={{ backgroundColor: c.hex }}
            >
              {on && <span className="sr-only">Selected</span>}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => { setOtherActive(true); onChange({ colour_id: null, custom_colour: value.custom_colour ?? '' }); }}
          className={`h-7 rounded-full border px-3 text-xs ${otherActive ? 'border-black bg-black text-white' : 'border-neutral-300 hover:border-neutral-400'}`}
        >
          Other
        </button>
      </div>
      {otherActive && (
        <input
          type="text"
          value={value.custom_colour ?? ''}
          onChange={(e) => onChange({ colour_id: null, custom_colour: e.target.value })}
          placeholder="Type a custom colour name (e.g. Mauve)"
          className="w-full rounded border border-neutral-200 px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
