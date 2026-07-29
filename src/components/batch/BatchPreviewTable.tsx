'use client';

import { Fragment, useState } from 'react';
import type { BatchRowPayload } from '@/types/product';
import type { GroupingError } from './csvTemplate';
import { formatINR } from '@/lib/price';

interface BatchPreviewTableProps {
  products: BatchRowPayload[];
  errors: GroupingError[];
}

export default function BatchPreviewTable({
  products,
  errors,
}: BatchPreviewTableProps): React.ReactElement {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {errors.map((e, i) => (
            <div key={i}>
              Row {e.rowIndex + 1}: {e.message}
            </div>
          ))}
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-600">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Brand</th>
            <th className="px-3 py-2">Retail</th>
            <th className="px-3 py-2">Variants</th>
            <th className="px-3 py-2">Images</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <Fragment key={i}>
              <tr
                className="cursor-pointer border-t border-neutral-200 hover:bg-neutral-50"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.brand_slug ?? '—'}</td>
                <td className="px-3 py-2">{formatINR(p.retail_price_minor)}</td>
                <td className="px-3 py-2">{p.variants?.length ?? 0}</td>
                <td className="px-3 py-2">{p.image_urls?.length ?? 0}</td>
              </tr>
              {expanded === i && (
                <tr className="bg-neutral-50">
                  <td colSpan={6} className="px-6 py-3 text-xs">
                    <div className="font-semibold">Variants</div>
                    <ul className="mt-1 space-y-0.5">
                      {(p.variants ?? []).map((v, vi) => (
                        <li key={vi}>
                          {v.size} / {v.colour_slug ?? v.custom_colour ?? '—'} / qty {v.quantity} / {v.location_slug ?? '—'}
                        </li>
                      ))}
                    </ul>
                    {(p.image_urls ?? []).length > 0 && (
                      <>
                        <div className="mt-2 font-semibold">Image URLs</div>
                        <ul className="mt-1 space-y-0.5">
                          {(p.image_urls ?? []).map((u, ui) => (
                            <li key={ui} className="truncate">
                              {u}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
