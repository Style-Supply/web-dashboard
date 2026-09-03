'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase, PRODUCT_IMAGES_BUCKET } from '@/lib/supabase';

/**
 * Compresses an image file to max 1600x1600 JPEG at 85% quality to avoid
 * payload explosion and PostgREST payload limits while preserving crisp QC inspection details.
 */
export async function compressQcImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    // If SVG, don't re-compress on canvas
    if (file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1600;
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        },
        'image/jpeg',
        0.85,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Uploads a single file to Supabase Storage 'product-images' bucket under 'qc-photos/...'.
 * If direct upload fails (e.g. offline dev or bucket config), cleanly falls back to a compressed data URL.
 */
export async function uploadQcImage(file: File, itemId: string): Promise<string> {
  try {
    const compressedBlob = await compressQcImage(file);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const storagePath = `qc-photos/${itemId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(storagePath, compressedBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (!uploadErr) {
      const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch (err) {
    console.warn('[QC Upload] Storage upload failed, falling back to data URL:', err);
  }

  // Fallback to base64 Data URL (compressed)
  const compressedBlob = await compressQcImage(file);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressedBlob);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface StagedFile {
  id: string;
  file: File;
  previewUrl: string;
}

export interface QcPhotoModalProps {
  open: boolean;
  onClose: () => void;
  checkpointTitle: string;
  itemId: string;
  onAddImages: (urls: string[]) => void;
  showToast: (type: 'success' | 'error', msg: string) => void;
}

export function QcPhotoModal({
  open,
  onClose,
  checkpointTitle,
  itemId,
  onAddImages,
  showToast,
}: QcPhotoModalProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'urls'>('files');
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  // URL tab state
  const [urlInput, setUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs when unmounting or changing staged files
  useEffect(() => {
    return () => {
      stagedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, [stagedFiles]);

  const addFilesToStaging = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;

    const newlyStaged: StagedFile[] = list.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setStagedFiles((prev) => [...prev, ...newlyStaged]);
  }, []);

  // Handle clipboard paste of screenshots or images anywhere when modal is open
  useEffect(() => {
    if (!open) return;

    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        addFilesToStaging(pastedFiles);
        showToast('success', `Pasted ${pastedFiles.length} image(s) from clipboard`);
      }
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open, addFilesToStaging, showToast]);

  if (!open) return null;

  function removeStagedFile(id: string) {
    setStagedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  async function handleUploadStagedFiles() {
    if (stagedFiles.length === 0) return;
    setUploading(true);

    const uploadedUrls: string[] = [];
    const total = stagedFiles.length;

    try {
      for (let i = 0; i < total; i++) {
        const item = stagedFiles[i];
        setUploadProgress({ current: i + 1, total, name: item.file.name });
        const url = await uploadQcImage(item.file, itemId);
        uploadedUrls.push(url);
      }

      onAddImages(uploadedUrls);
      showToast('success', `Added ${uploadedUrls.length} QC photo(s) successfully`);
      setStagedFiles([]);
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to upload some photos');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  function handleAddUrls() {
    const rawUrls = urlInput
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (rawUrls.length === 0) {
      showToast('error', 'Please enter at least one valid image URL');
      return;
    }

    // Basic URL format validation
    const validUrls: string[] = [];
    for (const u of rawUrls) {
      if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image/')) {
        validUrls.push(u);
      }
    }

    if (validUrls.length === 0) {
      showToast('error', 'No valid image URLs found (must start with http:// or https://)');
      return;
    }

    onAddImages(validUrls);
    showToast('success', `Added ${validUrls.length} image URL(s)`);
    setUrlInput('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <span>📷 Add QC Photos</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-200/80 text-neutral-700">
                {checkpointTitle}
              </span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Upload multiple inspection photos to document condition, defects, or tags.
            </p>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-lg leading-none"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 bg-white px-5">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'files'
                ? 'border-[#7A021D] text-[#7A021D]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span>📁 Upload & Drop Multiple Files</span>
            {stagedFiles.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#7A021D] text-white font-bold">
                {stagedFiles.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('urls')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'urls'
                ? 'border-[#7A021D] text-[#7A021D]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <span>🔗 Add from URLs</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'files' ? (
            <div className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files) {
                    addFilesToStaging(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  isDragOver
                    ? 'border-[#7A021D] bg-[#7A021D]/5 scale-[0.99]'
                    : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/heic,image/*"
                  onChange={(e) => {
                    if (e.target.files) addFilesToStaging(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <div className="mx-auto w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 mb-2">
                  📷
                </div>
                <div className="text-xs font-semibold text-neutral-800">
                  Drag & drop multiple photos here, or <span className="text-[#7A021D] underline">browse files</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  Supports multiple JPEG, PNG, WEBP · Auto-optimized for quality inspection
                </div>
              </div>

              {/* Clipboard paste notice */}
              <div className="text-[11px] text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 flex items-center gap-2">
                <span>📋</span>
                <span>
                  <strong>Tip:</strong> You can also copy an image or take a screenshot and press{' '}
                  <kbd className="px-1 py-0.5 rounded bg-white border border-neutral-300 text-[10px] font-mono shadow-2xs">
                    Ctrl+V
                  </kbd>{' '}
                  or{' '}
                  <kbd className="px-1 py-0.5 rounded bg-white border border-neutral-300 text-[10px] font-mono shadow-2xs">
                    ⌘V
                  </kbd>{' '}
                  to paste directly.
                </span>
              </div>

              {/* Staged Files Preview List */}
              {stagedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-700">
                      Staged Photos ({stagedFiles.length})
                    </span>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setStagedFiles([])}
                      className="text-[11px] text-red-600 hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                    {stagedFiles.map((item, idx) => (
                      <div
                        key={item.id}
                        className="relative group rounded-lg border border-neutral-200 overflow-hidden bg-white flex items-center gap-2 p-1.5 shadow-2xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewUrl}
                          alt=""
                          className="w-12 h-12 rounded object-cover shrink-0 bg-neutral-100"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-medium text-neutral-800 truncate" title={item.file.name}>
                            {item.file.name}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {formatBytes(item.file.size)}
                          </div>
                          <div className="text-[9px] text-[#7A021D] font-medium">#{idx + 1}</div>
                        </div>
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => removeStagedFile(item.id)}
                          className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-neutral-100 transition-colors shrink-0"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Progress Bar */}
              {uploading && uploadProgress && (
                <div className="rounded-lg bg-[#7A021D]/5 border border-[#7A021D]/20 p-3 space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-[#7A021D]">
                    <span>
                      Uploading photo {uploadProgress.current} of {uploadProgress.total}…
                    </span>
                    <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#7A021D] h-full transition-all duration-200"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">{uploadProgress.name}</div>
                </div>
              )}
            </div>
          ) : (
            /* URLs Tab */
            <div className="space-y-3">
              <label className="block text-xs font-medium text-neutral-700">
                Paste Image URLs (one URL per line, or comma-separated):
              </label>
              <textarea
                rows={5}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/photos/item-front.jpg&#10;https://example.com/photos/item-zipper.jpg&#10;https://example.com/photos/item-tag.jpg"
                className="w-full text-xs font-mono p-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black leading-relaxed"
              />
              <p className="text-[11px] text-neutral-400">
                You can paste multiple links from external image storage or inspection reports.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
          <button
            type="button"
            disabled={uploading}
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-200/60 transition-colors"
          >
            Cancel
          </button>

          {activeTab === 'files' ? (
            <button
              type="button"
              disabled={uploading || stagedFiles.length === 0}
              onClick={handleUploadStagedFiles}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#7A021D] hover:bg-[#600217] text-white disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {uploading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Uploading…</span>
                </>
              ) : (
                <span>Upload {stagedFiles.length > 0 ? `${stagedFiles.length} Photo${stagedFiles.length > 1 ? 's' : ''}` : 'Photos'}</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={!urlInput.trim()}
              onClick={handleAddUrls}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#7A021D] hover:bg-[#600217] text-white disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
            >
              Add URLs to Photos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface QcPhotoLightboxProps {
  images: string[];
  selectedIndex: number | null;
  onClose: () => void;
  onDelete?: (index: number) => void;
  checkpointTitle?: string;
}

export function QcPhotoLightbox({
  images,
  selectedIndex,
  onClose,
  onDelete,
  checkpointTitle,
}: QcPhotoLightboxProps) {
  const [index, setIndex] = useState<number | null>(selectedIndex);

  useEffect(() => {
    setIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (index === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        setIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, images.length, onClose]);

  if (index === null || !images[index]) return null;

  const currentImg = images[index];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      {/* Lightbox Header Bar */}
      <div
        className="flex items-center justify-between px-6 py-4 text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wider text-neutral-300 uppercase">
            {checkpointTitle || 'QC Inspection Photo'}
          </span>
          <span className="text-xs text-neutral-400 bg-white/10 px-2.5 py-0.5 rounded-full font-mono">
            {index + 1} of {images.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to remove this inspection photo?')) {
                  onDelete(index);
                  if (images.length <= 1) {
                    onClose();
                  } else {
                    setIndex((prev) => (prev !== null && prev >= images.length - 1 ? images.length - 2 : prev));
                  }
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/50 transition-colors border border-red-800/40"
            >
              🗑️ Delete Photo
            </button>
          )}

          <a
            href={currentImg}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-300 hover:text-white px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
          >
            ↗ Open Original
          </a>

          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-neutral-300 text-xl px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors leading-none"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Photo Display */}
      <div
        className="flex-1 flex items-center justify-center relative p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1))}
            className="absolute left-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center text-xl border border-white/20 transition-transform active:scale-95 shadow-lg"
            title="Previous (Left Arrow)"
          >
            ‹
          </button>
        )}

        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImg}
          alt={`QC Inspection detail ${index + 1}`}
          className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-white/10 transition-all duration-150"
        />

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0))}
            className="absolute right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center text-xl border border-white/20 transition-transform active:scale-95 shadow-lg"
            title="Next (Right Arrow)"
          >
            ›
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div
          className="px-6 py-3 flex justify-center gap-2 overflow-x-auto z-10 bg-black/40"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setIndex(idx)}
              className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                idx === index ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
