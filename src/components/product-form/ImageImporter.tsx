'use client';

import { useRef, useState } from 'react';
import type { ProductImage } from '@/types/product';
import {
  importImagesFromUrls,
  scrapeImagesFromPage,
  uploadImages,
  deleteImage,
  reorderImages,
} from '@/lib/api';
import { isLikelyHttpUrl } from '@/lib/url-check';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';

interface ImageImporterProps {
  productId: string | null;
  images: ProductImage[];
  onImagesChange: (next: ProductImage[]) => void;
}

type Mode = 'url' | 'page' | 'upload';

export default function ImageImporter({
  productId,
  images,
  onImagesChange,
}: ImageImporterProps): React.ReactElement {
  const [mode, setMode] = useState<Mode>('page');
  const [urlText, setUrlText] = useState<string>('');
  const [pageUrl, setPageUrl] = useState<string>('');
  const [busy, setBusy] = useState<false | 'url' | 'page' | 'upload'>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (productId === null) {
    return (
      <div className="rounded border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
        Save the draft first to attach images.
      </div>
    );
  }

  async function handleImportUrls(): Promise<void> {
    if (!productId) return;
    const urls = urlText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && isLikelyHttpUrl(s));
    if (urls.length === 0) return;
    setBusy('url');
    try {
      const result = await importImagesFromUrls(productId, urls);
      onImagesChange([...images, ...result.imported]);
      setUrlText('');
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  async function handleScrapePage(): Promise<void> {
    if (!productId) return;
    const url = pageUrl.trim();
    if (!url || !isLikelyHttpUrl(url)) return;
    setBusy('page');
    try {
      const result = await scrapeImagesFromPage(productId, url);
      onImagesChange([...images, ...result.imported]);
      setPageUrl('');
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  async function handleFiles(files: File[]): Promise<void> {
    if (!productId || files.length === 0) return;
    setBusy('upload');
    try {
      const result = await uploadImages(productId, files);
      onImagesChange([...images, ...result.imported]);
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(imageId: string): Promise<void> {
    setDeletingId(imageId);
    try {
      await deleteImage(imageId);
      onImagesChange(images.filter((i) => i.id !== imageId));
    } catch (e) {
      console.error('Failed to delete image', e);
    } finally {
      setDeletingId(null);
    }
  }

  function handleAltChange(imageId: string, alt: string): void {
    // TODO: backend PATCH does not persist image alt text yet — update local only.
    onImagesChange(images.map((i) => (i.id === imageId ? { ...i, alt } : i)));
  }

  function handleReorderDrop(targetIndex: number): void {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    const reindexed = next.map((img, idx) => ({ ...img, sort_order: idx }));
    onImagesChange(reindexed);
    if (productId) void reorderImages(productId, reindexed.map((i) => i.id));
    setDragIndex(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 rounded px-3 py-1.5 ${mode === 'url' ? 'bg-white shadow' : 'text-neutral-600'}`}
        >
          From URL
        </button>
        <button
          type="button"
          onClick={() => setMode('page')}
          className={`flex-1 rounded px-3 py-1.5 ${mode === 'page' ? 'bg-white shadow' : 'text-neutral-600'}`}
        >
          From page
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex-1 rounded px-3 py-1.5 ${mode === 'upload' ? 'bg-white shadow' : 'text-neutral-600'}`}
        >
          Upload
        </button>
      </div>

      {mode === 'url' ? (
        <div className="space-y-2">
          <Textarea
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder="One image URL per line"
          />
          <Button variant="secondary" size="sm" loading={busy === 'url'} disabled={!!busy} onClick={handleImportUrls}>
            {busy === 'url' ? 'Importing…' : 'Import from URLs'}
          </Button>
        </div>
      ) : mode === 'page' ? (
        <div className="space-y-2">
          <input
            type="url"
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            placeholder="https://example.com/product/123"
            className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-neutral-500">
            Paste a product page URL. We&apos;ll scrape og:image, JSON-LD, and inline &lt;img&gt; tags and import up to 20 candidates.
          </p>
          <Button variant="secondary" size="sm" loading={busy === 'page'} disabled={!!busy} onClick={handleScrapePage}>
            {busy === 'page' ? 'Scraping…' : 'Scrape page'}
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
            void handleFiles(files);
          }}
          className={`rounded border border-dashed p-6 text-center text-sm ${dragOver ? 'border-[color:var(--color-primary)] bg-red-50' : 'border-neutral-300 bg-neutral-50'}`}
        >
          <p className="text-neutral-600">{busy === 'upload' ? 'Uploading…' : 'Drop images here'}</p>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              void handleFiles(files);
              e.target.value = '';
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            type="button"
            className="mt-3"
            loading={busy === 'upload'}
            disabled={!!busy}
            onClick={() => fileRef.current?.click()}
          >
            Choose files
          </Button>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleReorderDrop(index)}
              className="rounded border border-neutral-200 bg-white p-2"
            >
              <div className="relative aspect-square overflow-hidden rounded bg-neutral-100">
                {img.public_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.public_url}
                    alt={img.alt ?? ''}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {deletingId === img.id && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>
              <input
                className="mt-2 w-full rounded border border-neutral-200 px-2 py-1 text-xs"
                value={img.alt ?? ''}
                placeholder="Alt text"
                onChange={(e) => handleAltChange(img.id, e.target.value)}
              />
              <button
                type="button"
                disabled={deletingId === img.id}
                onClick={() => void handleDelete(img.id)}
                className="mt-1 w-full text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                {deletingId === img.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
