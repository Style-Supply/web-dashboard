'use client';

import type { BatchImportRow } from '@/lib/api';

interface BatchResultsTableProps {
  results: BatchImportRow[];
  retryingIndex?: number | null;
  onRetry: (index: number) => void;
}

export default function BatchResultsTable({
  results,
  retryingIndex = null,
  onRetry,
}: BatchResultsTableProps): React.ReactElement {
  return (
    <table className="w-full text-sm">
      <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-600">
        <tr>
          <th className="px-3 py-2">#</th>
          <th className="px-3 py-2">Status</th>
          <th className="px-3 py-2">Detail</th>
          <th className="px-3 py-2" />
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.index} className="border-t border-neutral-200">
            <td className="px-3 py-2">{r.index + 1}</td>
            <td className="px-3 py-2">
              {r.status === 'ok' ? (
                <span className="text-green-600">ok</span>
              ) : (
                <span className="text-red-600">error</span>
              )}
            </td>
            <td className="px-3 py-2 text-xs">
              {r.status === 'ok' ? r.product_id : r.error}
            </td>
            <td className="px-3 py-2 text-right">
              {r.status !== 'ok' && (
                <button
                  type="button"
                  disabled={retryingIndex === r.index}
                  onClick={() => onRetry(r.index)}
                  className="inline-flex items-center gap-1 text-xs text-[color:var(--color-primary)] underline disabled:opacity-50"
                >
                  {retryingIndex === r.index && (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  {retryingIndex === r.index ? 'Retrying…' : 'Retry'}
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
