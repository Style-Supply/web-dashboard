'use client';

import { useState } from 'react';
import type { BatchProductPayload } from '@/types/product';
import { batchImport, type BatchImportRow } from '@/lib/api';
import { parseCsvFile } from '@/lib/csv-parse';
import type { GroupingError } from '@/components/batch/csvTemplate';
import CsvDropzone from '@/components/batch/CsvDropzone';
import BatchPreviewTable from '@/components/batch/BatchPreviewTable';
import BatchResultsTable from '@/components/batch/BatchResultsTable';
import Button from '@/components/ui/Button';
import { useProducts } from '@/context/ProductsContext';

type Step = 'drop' | 'preview' | 'results';

export default function BatchPage(): React.ReactElement {
  const { invalidate } = useProducts();
  const [step, setStep] = useState<Step>('drop');
  const [products, setProducts] = useState<BatchProductPayload[]>([]);
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
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Batch upload</h1>
      {step === 'drop' && <CsvDropzone onFile={(f) => void handleFile(f)} />}
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
          <BatchResultsTable results={results} retryingIndex={retryingIndex} onRetry={(i) => void handleRetry(i)} />
          <Button variant="secondary" onClick={() => setStep('drop')}>
            Upload another
          </Button>
        </div>
      )}
    </div>
  );
}
