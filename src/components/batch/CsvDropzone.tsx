'use client';

import { useRef, useState } from 'react';
import Button from '@/components/ui/Button';

interface CsvDropzoneProps {
  onFile: (file: File) => void;
  onOpenGuide?: () => void;
}

export default function CsvDropzone({ onFile, onOpenGuide }: CsvDropzoneProps): React.ReactElement {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f && f.name.endsWith('.csv')) onFile(f);
      }}
      className={`rounded-2xl border-2 border-dashed p-10 md:p-14 text-center transition-all ${
        dragOver
          ? 'border-[#7A021D] bg-[#FDF8F4]'
          : 'border-neutral-300 bg-white hover:border-[#7A021D]/50 hover:bg-[#FDF8F4]/30'
      }`}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FDF8F4] text-[#7A021D] mb-4 shadow-xs">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>

      <h3 className="text-base font-bold text-[#2C0505]">Drag & Drop your catalogue CSV file here</h3>
      <p className="mt-1 text-xs text-neutral-500 max-w-md mx-auto">
        Supports product details, prices, images, and multi-row variant groupings (sizes, colors, quantities, locations).
      </p>

      <input
        ref={ref}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />

      <div className="mt-5 flex items-center justify-center gap-3">
        <Button
          variant="primary"
          size="sm"
          type="button"
          onClick={() => ref.current?.click()}
          className="shadow-sm"
        >
          📂 Browse CSV File
        </Button>
        {onOpenGuide && (
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={onOpenGuide}
          >
            ❓ View Upload Guide
          </Button>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-center gap-4 text-xs text-neutral-500">
        <span>Need a template?</span>
        <a
          href="/dashboard-template.csv"
          download="dashboard-template.csv"
          className="inline-flex items-center gap-1 font-semibold text-[#7A021D] hover:underline"
        >
          <span>📥</span> Download CSV Template
        </a>
      </div>
    </div>
  );
}

