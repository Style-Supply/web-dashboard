'use client';

import { useState } from 'react';

const SAMPLE_CSV = `name,sku,brand,category_type,subcategory,sub_subcategory,material,fabric_details,description,retail_price_inr,rent_price_inr,currency,is_rentable,is_buyable,collection,status,variant_size,variant_colour,variant_quantity,variant_location,image_urls
Veira- beige dress,RBL-002,Ranu Beniwal,Women,Dresses,,Cotton-Linen Blend,"Main Fabric: Cotton-Linen Blend. Lining: 100% Recycled Cotton.",,26500,2500,INR,TRUE,TRUE,,draft,S,Beige,1,Pune,
Solaya Top,RBL-006,Ranu Beniwal,Women,Tops,,100% Cotton Slub,"Main Fabric: 100% Cotton Slub. Lining: 100% Recycled Cotton.",,13900,1390,INR,TRUE,TRUE,,draft,XS,Yellow,1,Pune,
Solaya Top,RBL-006,,,,,,,,,,,,,,,S,Yellow,1,Pune,
Solaya Top,RBL-006,,,,,,,,,,,,,,,M,Yellow,1,Pune,`;

export default function BatchGuide({ onClose }: { onClose?: () => void }): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'steps' | 'variants' | 'columns'>('steps');

  function handleCopy() {
    navigator.clipboard.writeText(SAMPLE_CSV);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_product_upload.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="rounded-2xl border border-[#7A021D]/20 bg-[#FDF8F4] p-5 md:p-6 shadow-sm transition-all mb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#7A021D]/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7A021D] text-white text-xs font-bold shadow-xs">
              ?
            </span>
            <h2 className="text-base md:text-lg font-bold text-[#2C0505]">
              Bulk Upload Guide & Instructions
            </h2>
          </div>
          <p className="mt-1 text-xs md:text-sm text-neutral-600">
            Learn how to format CSV files, group variants (size, color, stock, location), and upload catalogue items in bulk.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-xl border border-[#7A021D]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#7A021D] hover:bg-[#FDF8F4] transition-colors shadow-2xs"
          >
            <span>📥</span> Download Sample CSV
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-black/5 hover:text-neutral-700 transition-colors"
              title="Close guide"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 pt-4 pb-3 border-b border-[#7A021D]/10">
        <button
          onClick={() => setActiveTab('steps')}
          className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
            activeTab === 'steps'
              ? 'bg-[#7A021D] text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          1. Upload Steps
        </button>
        <button
          onClick={() => setActiveTab('variants')}
          className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
            activeTab === 'variants'
              ? 'bg-[#7A021D] text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          2. Adding Variants (Size, Color, Qty, Location)
        </button>
        <button
          onClick={() => setActiveTab('columns')}
          className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
            activeTab === 'columns'
              ? 'bg-[#7A021D] text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          3. Column Reference & Rules
        </button>
      </div>

      {/* Tab 1: Upload Steps */}
      {activeTab === 'steps' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-[#7A021D] font-bold text-xs">
                1
              </span>
              <h3 className="font-bold text-sm text-[#2C0505]">Prepare your CSV</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Export your catalogue from Excel / Google Sheets as a <strong>.csv</strong> file. Make sure column headers match the template names.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-[#7A021D] font-bold text-xs">
                2
              </span>
              <h3 className="font-bold text-sm text-[#2C0505]">Drop & Preview</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Drag and drop the CSV file below. The dashboard automatically validates data, calculates pricing, groups multi-row variants, and previews each product card.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-[#7A021D] font-bold text-xs">
                3
              </span>
              <h3 className="font-bold text-sm text-[#2C0505]">Import & Auto-Upsert</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Click <strong>Import Products</strong>. If an SKU already exists, it updates and merges the new variants/details automatically without duplicate errors!
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Adding Variants */}
      {activeTab === 'variants' && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
            <h3 className="font-bold text-sm text-[#7A021D] mb-1">
              Method A: Multi-Row Method (Recommended & Intuitive)
            </h3>
            <p className="text-xs text-neutral-600 mb-3">
              Put the full product details on the <strong>first row</strong>. For every additional size/color variant of that product, add a new row with just the <strong>Product Name</strong> or <strong>SKU</strong> and the variant columns:
            </p>

            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50/70 p-2 font-mono text-[11px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 font-bold">
                    <th className="p-1.5">name</th>
                    <th className="p-1.5">sku</th>
                    <th className="p-1.5">brand</th>
                    <th className="p-1.5">retail_price_inr</th>
                    <th className="p-1.5 text-emerald-700">variant_size</th>
                    <th className="p-1.5 text-emerald-700">variant_colour</th>
                    <th className="p-1.5 text-emerald-700">variant_quantity</th>
                    <th className="p-1.5 text-emerald-700">variant_location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60 bg-white">
                  <tr>
                    <td className="p-1.5 font-semibold text-neutral-900">Solaya Top</td>
                    <td className="p-1.5">RBL-006</td>
                    <td className="p-1.5">Ranu Beniwal</td>
                    <td className="p-1.5">13900</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">XS</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">Yellow</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">1</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">Pune</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-semibold text-neutral-900">Solaya Top</td>
                    <td className="p-1.5">RBL-006</td>
                    <td className="p-1.5 text-neutral-300">—</td>
                    <td className="p-1.5 text-neutral-300">—</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">S</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">Yellow</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">1</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">Pune</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-semibold text-neutral-900">Solaya Top</td>
                    <td className="p-1.5">RBL-006</td>
                    <td className="p-1.5 text-neutral-300">—</td>
                    <td className="p-1.5 text-neutral-300">—</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">M</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">Yellow</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">1</td>
                    <td className="p-1.5 font-bold text-emerald-700 bg-emerald-50/50">Pune</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-2.5 text-[11px] text-neutral-500">
              💡 <em>The system will automatically group these 3 rows into a single &ldquo;Solaya Top&rdquo; product with 3 sizes (XS, S, M) and 1 inventory unit at Pune each.</em>
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
            <h3 className="font-bold text-sm text-[#7A021D] mb-1">
              Method B: JSON Column (<code className="text-xs bg-neutral-100 px-1 py-0.5 rounded font-mono">variants_json</code>)
            </h3>
            <p className="text-xs text-neutral-600 mb-2">
              Alternatively, keep one row per product and place all variants in a single JSON array column:
            </p>
            <pre className="rounded-lg bg-neutral-900 text-emerald-400 p-3 text-[11px] overflow-x-auto font-mono">
{`[
  {"size": "XS", "colour": "Yellow", "quantity": 1, "location": "Pune"},
  {"size": "S", "colour": "Yellow", "quantity": 1, "location": "Pune"},
  {"size": "M", "colour": "Yellow", "quantity": 1, "location": "Pune"}
]`}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 3: Columns Reference */}
      {activeTab === 'columns' && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 font-bold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-3.5 py-2.5">Header</th>
                <th className="px-3.5 py-2.5">Type</th>
                <th className="px-3.5 py-2.5">Description & Example</th>
                <th className="px-3.5 py-2.5">Required?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">name</td>
                <td className="px-3.5 py-2">Text</td>
                <td className="px-3.5 py-2">Product Title (e.g. <code>Solaya Top</code>)</td>
                <td className="px-3.5 py-2 font-semibold text-emerald-700">Yes</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">sku</td>
                <td className="px-3.5 py-2">Text</td>
                <td className="px-3.5 py-2">Master SKU code (e.g. <code>RBL-006</code>). Used for auto-upserting.</td>
                <td className="px-3.5 py-2 text-neutral-500">Recommended</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">brand</td>
                <td className="px-3.5 py-2">Text</td>
                <td className="px-3.5 py-2">Brand name (e.g. <code>Ranu Beniwal</code>, <code>Baobab</code>)</td>
                <td className="px-3.5 py-2 text-neutral-500">Optional</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">category_type</td>
                <td className="px-3.5 py-2">Text</td>
                <td className="px-3.5 py-2">Main Category (e.g. <code>Women</code>, <code>Men</code>)</td>
                <td className="px-3.5 py-2 text-neutral-500">Optional</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">subcategory</td>
                <td className="px-3.5 py-2">Text</td>
                <td className="px-3.5 py-2">Subcategory (e.g. <code>Dresses</code>, <code>Tops</code>, <code>Pants</code>, <code>Co-ord Sets</code>)</td>
                <td className="px-3.5 py-2 text-neutral-500">Optional</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">retail_price_inr</td>
                <td className="px-3.5 py-2">Number</td>
                <td className="px-3.5 py-2">Retail MRP in Rupees (e.g. <code>13900</code>)</td>
                <td className="px-3.5 py-2 font-semibold text-emerald-700">Yes</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">rent_price_inr</td>
                <td className="px-3.5 py-2">Number</td>
                <td className="px-3.5 py-2">Rental price in Rupees (e.g. <code>1390</code>)</td>
                <td className="px-3.5 py-2 text-neutral-500">Optional</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">variant_size</td>
                <td className="px-3.5 py-2">Text</td>
                <td className="px-3.5 py-2"><code>XS</code>, <code>S</code>, <code>M</code>, <code>L</code>, <code>XL</code>, <code>Free</code></td>
                <td className="px-3.5 py-2 font-semibold text-emerald-700">Yes</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">variant_colour</td>
                <td className="px-3.5 py-2">Text</td>
                <td className="px-3.5 py-2">Color name (e.g. <code>Yellow</code>, <code>Mist Green</code>, <code>Beige</code>)</td>
                <td className="px-3.5 py-2 text-neutral-500">Optional</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">variant_quantity</td>
                <td className="px-3.5 py-2">Integer</td>
                <td className="px-3.5 py-2">Stock count (e.g. <code>1</code>, <code>5</code>)</td>
                <td className="px-3.5 py-2 text-neutral-500">Default: 1</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">variant_location</td>
                <td className="px-3.5 py-2">Text</td>
                <td className="px-3.5 py-2">Store / Warehouse name (e.g. <code>Pune</code>, <code>Mumbai</code>)</td>
                <td className="px-3.5 py-2 text-neutral-500">Optional</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">image_urls</td>
                <td className="px-3.5 py-2">Text</td>
                <td className="px-3.5 py-2">Public URLs separated by <code>|</code> or comma</td>
                <td className="px-3.5 py-2 text-neutral-500">Optional</td>
              </tr>
              <tr>
                <td className="px-3.5 py-2 font-mono font-bold text-[#7A021D]">status</td>
                <td className="px-3.5 py-2">Text</td>
                <td className="px-3.5 py-2"><code>draft</code> (default) or <code>published</code></td>
                <td className="px-3.5 py-2 text-neutral-500">Default: draft</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Copy Sample CSV Box */}
      <div className="mt-4 pt-4 border-t border-[#7A021D]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p className="text-xs text-neutral-500">
          💡 Want a quick start? Copy or download our pre-formatted sample CSV.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#2C0505] hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            {copied ? '✅ Copied to Clipboard!' : '📋 Copy Sample CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}
