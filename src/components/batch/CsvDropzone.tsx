'use client';

import { useRef, useState } from 'react';
import Button from '@/components/ui/Button';

interface CsvDropzoneProps {
  onFile: (file: File) => void;
}

export default function CsvDropzone({ onFile }: CsvDropzoneProps): React.ReactElement {
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
      className={`rounded-lg border-2 border-dashed p-12 text-center ${dragOver ? 'border-[color:var(--color-primary)] bg-red-50' : 'border-neutral-300 bg-neutral-50'}`}
    >
      <p className="text-sm text-neutral-600">Drop a .csv file here</p>
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
      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        type="button"
        onClick={() => ref.current?.click()}
      >
        Choose file
      </Button>
      <p className="mt-3 text-xs text-neutral-500">
        Need a template?{' '}
        <a href="/dashboard-template.csv" className="underline">
          Download
        </a>
      </p>
    </div>
  );
}
