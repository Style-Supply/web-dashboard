'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { API_BASE, ApiError } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export async function uploadProductSizeChart(file: File): Promise<string> {
  // 1. Try direct Supabase storage upload first
  try {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const storagePath = `product-size-charts/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(storagePath, file, { contentType: file.type, upsert: true });

    if (!uploadErr) {
      const { data } = supabase.storage.from('product-images').getPublicUrl(storagePath);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch {
    // Fall back to backend API upload
  }

  // 2. Fallback via backend endpoint
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/admin/products/size-chart-upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new ApiError(body?.error?.message ?? res.statusText, res.status, body?.error?.code ?? null);
  }
  const result = await res.json() as { url: string };
  return result.url;
}

interface SizeChartUploaderProps {
  value: string | null;
  brandDefaultUrl?: string | null;
  brandName?: string | null;
  onChange: (url: string | null) => void;
}

export default function SizeChartUploader({
  value,
  brandDefaultUrl,
  brandName,
  onChange,
}: SizeChartUploaderProps): React.ReactElement {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select an image file');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('error', 'Size chart image must be smaller than 8 MB');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProductSizeChart(file);
      onChange(url);
      showToast('success', 'Custom size chart image uploaded');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  // Active chart image: custom product chart if set, otherwise brand default
  const hasCustomChart = !!value;
  const hasBrandDefault = !hasCustomChart && !!brandDefaultUrl;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-neutral-500">
          Size Chart (Optional)
        </label>
        {hasCustomChart ? (
          <span className="inline-flex items-center rounded-full bg-[#7A021D]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7A021D]">
            Custom Product Chart
          </span>
        ) : hasBrandDefault ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            Brand Default ({brandName || 'Brand'})
          </span>
        ) : (
          <span className="text-[11px] text-neutral-400">
            Optional · Falls back to brand default
          </span>
        )}
      </div>

      {hasCustomChart ? (
        <div className="relative rounded-xl border border-[#7A021D]/20 bg-[#FDF8F4]/30 p-3.5 space-y-3">
          <div className="relative h-40 w-full overflow-hidden rounded-lg bg-white border border-neutral-200 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value!}
              alt="Custom product size chart"
              className="h-full w-full object-contain"
              onError={(e) => { e.currentTarget.src = ''; }}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#7A021D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5a0115] transition-colors disabled:opacity-50 shadow-xs"
            >
              {uploading ? (
                <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> Uploading…</>
              ) : (
                <>Replace Custom Chart</>
              )}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={uploading}
              className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {brandDefaultUrl ? 'Revert to Brand Default' : 'Remove Chart'}
            </button>
          </div>
          {brandDefaultUrl && (
            <p className="text-[11px] text-neutral-500">
              Removing this custom chart will revert to {brandName || 'the brand'}&apos;s default size chart.
            </p>
          )}
        </div>
      ) : hasBrandDefault ? (
        <div className="relative rounded-xl border border-neutral-200 bg-neutral-50/50 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600 font-medium">
              Currently using {brandName ? `${brandName}'s` : 'Brand'} default size chart:
            </span>
          </div>
          <div className="relative h-40 w-full overflow-hidden rounded-lg bg-white border border-neutral-200 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandDefaultUrl!}
              alt="Brand default size chart"
              className="h-full w-full object-contain"
              onError={(e) => { e.currentTarget.src = ''; }}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#7A021D] px-3.5 py-1.5 text-xs font-medium text-[#7A021D] hover:bg-[#FDF8F4] transition-colors disabled:opacity-50 shadow-xs"
            >
              {uploading ? (
                <><span className="h-3 w-3 animate-spin rounded-full border-2 border-[#7A021D] border-t-transparent" /> Uploading…</>
              ) : (
                <>+ Override with Custom Size Chart</>
              )}
            </button>
            <span className="text-[11px] text-neutral-400">
              Applies to this product only
            </span>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${
            dragOver
              ? 'border-[#7A021D] bg-[#FDF8F4]'
              : 'border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#7A021D] border-t-transparent" />
              <p className="text-xs font-medium text-[#7A021D]">Uploading size chart…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="rounded-full bg-white p-2 shadow-xs border border-neutral-100">
                <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-neutral-700">
                {dragOver ? 'Drop image here' : 'Click or drag to upload product size chart'}
              </p>
              <p className="text-[11px] text-neutral-400">
                PNG, JPG, WEBP, SVG up to 8 MB {brandName ? `(No default set for ${brandName})` : ''}
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
