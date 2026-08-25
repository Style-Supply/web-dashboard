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
  onChange: (url: string | null) => void;
}

export default function SizeChartUploader({ value, onChange }: SizeChartUploaderProps): React.ReactElement {
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
      showToast('success', 'Size chart image uploaded');
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

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-neutral-500">
          Size Chart Image (Optional)
        </label>
        <span className="text-[11px] text-neutral-400">
          Falls back to brand default if empty
        </span>
      </div>

      {value ? (
        <div className="relative rounded-xl border border-neutral-200 bg-white p-3">
          <div className="relative h-36 w-full overflow-hidden rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Size chart image"
              className="h-full w-full object-contain"
              onError={(e) => { e.currentTarget.src = ''; }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FDF8F4] border border-[#7A021D]/20 px-3 py-1.5 text-xs font-medium text-[#7A021D] hover:bg-[#f5e8e8] transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <><span className="h-3 w-3 animate-spin rounded-full border-2 border-[#7A021D] border-t-transparent" /> Uploading…</>
              ) : (
                <>Replace Image</>
              )}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={uploading}
              className="text-xs text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
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
              <p className="text-[11px] text-neutral-400">PNG, JPG, WEBP, SVG up to 8 MB</p>
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
