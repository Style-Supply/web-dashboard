'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import type { BatchImportRow } from '@/lib/api';
import type { BatchRowPayload } from '@/types/product';
import { formatINR } from '@/lib/price';

interface BatchResultsTableProps {
  results: BatchImportRow[];
  products?: BatchRowPayload[];
  retryingIndex?: number | null;
  onRetry: (index: number) => void;
}

export default function BatchResultsTable({
  results,
  products = [],
  retryingIndex = null,
  onRetry,
}: BatchResultsTableProps): React.ReactElement {
  const [expanded, setExpanded] = useState<number | null>(null);

  const total = results.length;
  const createdCount = results.filter((r) => r.status === 'ok').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return (
    <div className="space-y-6 font-[var(--font-manrope)]">
      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Total Processed</span>
          <p className="mt-1 text-2xl font-bold text-[#2C0505]">{total}</p>
          <span className="text-[11px] text-neutral-500">Products in CSV</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Successfully Created</span>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{createdCount}</p>
          <span className="text-[11px] text-emerald-700">New items added</span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Duplicates Skipped</span>
          <p className="mt-1 text-2xl font-bold text-amber-900">{skippedCount}</p>
          <span className="text-[11px] text-amber-700">Already in catalog</span>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-800">Errors</span>
          <p className="mt-1 text-2xl font-bold text-red-900">{errorCount}</p>
          <span className="text-[11px] text-red-700">Requires attention</span>
        </div>
      </div>

      {/* ── Results Table ── */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50/80 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3.5">#</th>
              <th className="px-4 py-3.5">Product &amp; Brand</th>
              <th className="px-4 py-3.5">SKU</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Pricing</th>
              <th className="px-4 py-3.5">Variants</th>
              <th className="px-4 py-3.5">Upload Status</th>
              <th className="px-4 py-3.5">Details &amp; Output</th>
              <th className="px-4 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {results.map((r) => {
              const p = products[r.index];
              const isOk = r.status === 'ok';
              const isSkipped = r.status === 'skipped';
              const isError = r.status === 'error';

              const prodName = r.name || p?.name || 'Product';
              const prodBrand = p?.brand_slug || '—';
              const prodSku = r.sku || p?.sku || '—';
              const category = p?.category_type_slug
                ? `${p.category_type_slug}${p.subcategory_slug ? ` / ${p.subcategory_slug}` : ''}`
                : '—';
              const priceText = p?.retail_price_minor != null ? formatINR(p.retail_price_minor) : '—';
              const rentText = p?.rent_price_minor != null ? formatINR(p.rent_price_minor) : null;
              const variantCount = p?.variants?.length ?? 0;
              const isRowExpanded = expanded === r.index;

              return (
                <Fragment key={r.index}>
                  <tr
                    className={`transition-colors align-top hover:bg-neutral-50/80 cursor-pointer ${
                      isRowExpanded ? 'bg-neutral-50/70' : ''
                    }`}
                    onClick={() => setExpanded(isRowExpanded ? null : r.index)}
                  >
                    <td className="px-4 py-4 font-mono text-xs text-neutral-400">
                      {r.index + 1}
                    </td>

                    <td className="px-4 py-4 font-bold text-[#2C0505]">
                      <div className="flex flex-col">
                        <span>{prodName}</span>
                        {prodBrand !== '—' && (
                          <span className="text-[11px] font-normal text-neutral-400">{prodBrand}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {prodSku !== '—' ? (
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs font-semibold text-neutral-700">
                          {prodSku}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-xs text-neutral-600">
                      {category}
                    </td>

                    <td className="px-4 py-4 text-xs">
                      <div className="font-semibold text-neutral-800">{priceText}</div>
                      {rentText && <div className="text-[11px] text-neutral-400">Rent: {rentText}</div>}
                    </td>

                    <td className="px-4 py-4 text-xs">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                        {variantCount} variant{variantCount !== 1 ? 's' : ''}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {isOk && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Created
                        </span>
                      )}
                      {isSkipped && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Duplicate (Skipped)
                        </span>
                      )}
                      {isError && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Failed
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 max-w-xs text-xs">
                      {isOk && (
                        <div className="text-emerald-900 font-medium">
                          {r.message || 'Product created successfully'}
                          {r.image_failures && r.image_failures.length > 0 && (
                            <p className="mt-0.5 text-[11px] text-amber-700">
                              ⚠️ {r.image_failures.length} image(s) could not be fetched
                            </p>
                          )}
                        </div>
                      )}
                      {isSkipped && (
                        <div className="text-amber-900 font-medium leading-relaxed">
                          {r.message || 'Duplicate product skipped'}
                        </div>
                      )}
                      {isError && (
                        <div className="text-red-700 font-medium leading-relaxed">
                          {r.error || 'Upload error'}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {r.product_id ? (
                          <Link
                            href={`/products/${r.product_id}`}
                            className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-[#7A021D] transition-colors"
                          >
                            View Product
                          </Link>
                        ) : null}

                        {isError && (
                          <button
                            type="button"
                            disabled={retryingIndex === r.index}
                            onClick={() => onRetry(r.index)}
                            className="rounded-xl border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-800 shadow-2xs hover:bg-red-100 disabled:opacity-50 transition-colors inline-flex items-center gap-1"
                          >
                            {retryingIndex === r.index && (
                              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            )}
                            {retryingIndex === r.index ? 'Retrying…' : 'Retry'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* ── Expanded Detail Drawer for each row ── */}
                  {isRowExpanded && (
                    <tr className="bg-neutral-50/80">
                      <td colSpan={9} className="px-6 py-4 text-xs border-t border-neutral-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-neutral-700">
                          {r.product_id && (
                            <div>
                              <span className="font-semibold text-neutral-900">Database ID:</span>{' '}
                              <code className="font-mono text-[11px]">{r.product_id}</code>
                            </div>
                          )}
                          {p?.material_slug && (
                            <div>
                              <span className="font-semibold text-neutral-900">Material:</span> {p.material_slug}
                            </div>
                          )}
                          {p?.sub_subcategory_slug && (
                            <div>
                              <span className="font-semibold text-neutral-900">Sub-subcategory:</span> {p.sub_subcategory_slug}
                            </div>
                          )}
                          {p?.look_slugs && p.look_slugs.length > 0 && (
                            <div>
                              <span className="font-semibold text-neutral-900">Collections / Looks:</span>{' '}
                              {p.look_slugs.join(', ')}
                            </div>
                          )}
                          {p?.fabric_details && (
                            <div className="col-span-2">
                              <span className="font-semibold text-neutral-900">Fabric Details:</span> {p.fabric_details}
                            </div>
                          )}
                          {p?.description && (
                            <div className="col-span-2">
                              <span className="font-semibold text-neutral-900">Description:</span> {p.description}
                            </div>
                          )}
                        </div>

                        {/* Variants Breakdown */}
                        {p?.variants && p.variants.length > 0 && (
                          <div className="mt-2">
                            <span className="font-semibold text-neutral-900 block mb-1">Inventory Variants:</span>
                            <div className="flex flex-wrap gap-2">
                              {p.variants.map((v, vi) => (
                                <span
                                  key={vi}
                                  className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 shadow-2xs"
                                >
                                  <strong>{v.size}</strong> • {v.colour_slug ?? v.custom_colour ?? 'Default Color'} • Qty:{' '}
                                  {v.quantity} • {v.location_slug ?? 'Main'}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Image URLs Breakdown */}
                        {p?.image_urls && p.image_urls.length > 0 && (
                          <div className="mt-3">
                            <span className="font-semibold text-neutral-900 block mb-1">
                              Image URLs ({p.image_urls.length}):
                            </span>
                            <ul className="space-y-0.5 font-mono text-[11px] text-neutral-500">
                              {p.image_urls.map((u, ui) => (
                                <li key={ui} className="truncate max-w-xl">
                                  {u}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

