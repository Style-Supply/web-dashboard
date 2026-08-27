'use client';

import { useState } from 'react';
import type { BatchRowPayload } from '@/types/product';
import { batchImport, type BatchImportRow } from '@/lib/api';
import { parseCsvFile } from '@/lib/csv-parse';
import type { GroupingError } from '@/components/batch/csvTemplate';
import CsvDropzone from '@/components/batch/CsvDropzone';
import BatchPreviewTable from '@/components/batch/BatchPreviewTable';
import BatchResultsTable from '@/components/batch/BatchResultsTable';
import BatchGuide from '@/components/batch/BatchGuide';
import Button from '@/components/ui/Button';
import { useProducts } from '@/context/ProductsContext';

type Step = 'drop' | 'preview' | 'results';

export default function BatchPage(): React.ReactElement {
  const { invalidate } = useProducts();
  const [step, setStep] = useState<Step>('drop');
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [products, setProducts] = useState<BatchRowPayload[]>([]);
  const [errors, setErrors] = useState<GroupingError[]>([]);
  const [results, setResults] = useState<BatchImportRow[]>([]);
  const [importing, setImporting] = useState<boolean>(false);
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);

  async function handleFile(file: File): Promise<void> {
    const result = await parseCsvFile(file);
    setProducts(result.products);
    setErrors(result.errors);
    setStep('preview');
  }

  async function handleImport(): Promise<void> {
    setImporting(true);
    try {
      const res = await batchImport(products);
      setResults(res);
      invalidate();
      setStep('results');
    } finally {
      setImporting(false);
    }
  }

  async function handleRetry(index: number): Promise<void> {
    const product = products[index];
    if (!product) return;
    setRetryingIndex(index);
    try {
      const res = await batchImport([product]);
      const replacement = res[0];
      if (replacement) {
        setResults((prev) => prev.map((r) => (r.index === index ? { ...replacement, index } : r)));
        invalidate();
      }
    } finally {
      setRetryingIndex(null);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#2C0505]">Batch Product Upload</h1>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#7A021D]/30 bg-[#FDF8F4] px-3 py-1 text-xs font-bold text-[#7A021D] hover:bg-[#7A021D] hover:text-white transition-all shadow-2xs"
            >
              <span>{showGuide ? 'Hide Guide' : '❓ View Guide & Instructions'}</span>
            </button>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Import hundreds of products, custom attributes, and multi-size/color inventory variants via CSV.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/dashboard-template.csv"
            download="dashboard-template.csv"
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-[#2C0505] hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            <span>📥</span> Download CSV Template
          </a>
        </div>
      </div>

      {/* Guide Banner */}
      {showGuide && <BatchGuide onClose={() => setShowGuide(false)} />}

      {step === 'drop' && (
        <CsvDropzone
          onFile={(f) => void handleFile(f)}
          onOpenGuide={() => setShowGuide(true)}
        />
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <BatchPreviewTable products={products} errors={errors} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('drop')}>
              Back
            </Button>
            <Button
              loading={importing}
              disabled={errors.length > 0 || products.length === 0}
              onClick={() => void handleImport()}
            >
              {importing ? `Importing ${products.length}…` : `Import ${products.length} product${products.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      )}

      {step === 'results' && (
        <div className="space-y-4">
          <BatchResultsTable
            results={results}
            products={products}
            retryingIndex={retryingIndex}
            onRetry={(i) => void handleRetry(i)}
          />
          <Button variant="secondary" onClick={() => setStep('drop')}>
            Upload another
          </Button>
        </div>
      )}
    </div>
  );
}

