'use client';

import { useRef, useState } from 'react';
import type { ProductImage } from '@/types/product';
import {
  importImagesFromUrls,
  scrapeImagesFromPage,
  uploadImages,
  retagImage,
  deleteImage,
  type ColourTag,
} from '@/lib/api';
import { isLikelyHttpUrl } from '@/lib/url-check';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';

export type SectionKind =
  | { type: 'colour'; colour_id: string; name: string; hex: string }
  | { type: 'custom'; custom_colour: string }
  | { type: 'unassigned' };

interface MoveTarget {
  label: string;
  tag: ColourTag;
}

interface Props {
  productId: string;
  kind: SectionKind;
  /** Images filtered to this section, in the user's drag order. */
  images: ProductImage[];
  /** Move targets (other sections) for the per-image "Move to…" menu. */
  moveTargets: MoveTarget[];
  /** Called after any uploader appends new images. Pass them up to the parent. */
  onAppendImages: (added: ProductImage[]) => void;
  /** Called after a user reorders within this section. Order is the new order of THIS section's images. */
  onReorderSection: (newOrderIds: string[]) => void;
  /** Called when an image's colour tag is changed. */
  onUpdateImage: (imageId: string, patch: Partial<ProductImage>) => void;
  /** Called when an image is deleted. */
  onDeleteImage: (imageId: string) => void;
}

type Mode = 'url' | 'page' | 'upload';

function tagForKind(kind: SectionKind): ColourTag {
  if (kind.type === 'colour') return { colour_id: kind.colour_id, custom_colour: null };
  if (kind.type === 'custom') return { colour_id: null, custom_colour: kind.custom_colour };
  return { colour_id: null, custom_colour: null };
}

function headerLabel(kind: SectionKind): string {
  if (kind.type === 'colour') return kind.name;
  if (kind.type === 'custom') return `Custom: ${kind.custom_colour}`;
  return 'Unassigned / All colours';
}

export default function ImageColourSection({
  productId,
  kind,
  images,
  moveTargets,
  onAppendImages,
  onReorderSection,
  onUpdateImage,
  onDeleteImage,
}: Props): React.ReactElement {
  const tag = tagForKind(kind);
  const [mode, setMode] = useState<Mode>('upload');
  const [urlText, setUrlText] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [busy, setBusy] = useState<false | 'url' | 'page' | 'upload'>(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [openMoveFor, setOpenMoveFor] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImportUrls(): Promise<void> {
    const urls = urlText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && isLikelyHttpUrl(s));
    if (urls.length === 0) return;
    setBusy('url');
    try {
      const result = await importImagesFromUrls(productId, urls, tag);
      onAppendImages(result.imported);
      setUrlText('');
      if (result.failed.length > 0) {
        alert(`Failed to import ${result.failed.length} image(s): ${result.failed.map((f) => f.reason).join(', ')}`);
      }
    } catch (e) {
      alert(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleScrapePage(): Promise<void> {
    const url = pageUrl.trim();
    if (!url || !isLikelyHttpUrl(url)) return;
    setBusy('page');
    try {
      const result = await scrapeImagesFromPage(productId, url, undefined, tag);
      onAppendImages(result.imported);
      setPageUrl('');
      if (result.imported.length === 0) alert('No images found on this page');
      else if (result.failed.length > 0) alert(`Imported ${result.imported.length} image(s), ${result.failed.length} failed`);
    } catch (e) {
      alert(`Scrape failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleFiles(files: File[]): Promise<void> {
    if (files.length === 0) return;
    setBusy('upload');
    try {
      const result = await uploadImages(productId, files, tag);
      onAppendImages(result.imported);
      if (result.failed.length > 0) {
        alert(`Failed to upload ${result.failed.length} file(s): ${result.failed.map((f) => `${f.url}: ${f.reason}`).join(', ')}`);
      }
    } catch (e) {
      alert(`Upload failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(imageId: string, targetTag: ColourTag): Promise<void> {
    setOpenMoveFor(null);
    try {
      const updated = await retagImage(imageId, targetTag);
      onUpdateImage(imageId, {
        colour_id: updated.colour_id,
        custom_colour: updated.custom_colour,
      });
    } catch (e) {
      alert(`Move failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  async function handleDelete(imageId: string): Promise<void> {
    try {
      await deleteImage(imageId);
      onDeleteImage(imageId);
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  function handleReorderDrop(targetIndex: number): void {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onReorderSection(next.map((i) => i.id));
    setDragIndex(null);
  }

  return (
    <section className="space-y-3 rounded border border-neutral-200 bg-white p-4">
      <header className="flex items-center gap-2">
        {kind.type === 'colour' && (
          <span className="inline-block h-4 w-4 rounded-full border" style={{ backgroundColor: kind.hex }} />
        )}
        <h3 className="text-sm font-semibold text-neutral-800">{headerLabel(kind)}</h3>
        <span className="ml-auto text-xs text-neutral-500">{images.length} image{images.length === 1 ? '' : 's'}</span>
      </header>

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
        <div>
          <p className="mb-2 text-xs text-neutral-500">Drag images to reorder.</p>
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, index) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleReorderDrop(index)}
                className={`group relative cursor-grab rounded border bg-white p-2 transition-all active:cursor-grabbing ${
                  dragIndex === index
                    ? 'border-[color:var(--color-primary)] ring-2 ring-[color:var(--color-primary)]/20'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-medium text-white">
                  {index + 1}
                </div>
                <div className="relative aspect-square overflow-hidden rounded bg-neutral-100">
                  {img.public_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.public_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-500">
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => void handleDelete(img.id)}
                  >
                    Delete
                  </button>
                  <div className="relative ml-auto">
                    <button
                      type="button"
                      className="text-neutral-400 hover:text-black"
                      onClick={() => setOpenMoveFor(openMoveFor === img.id ? null : img.id)}
                    >
                      Move to…
                    </button>
                    {openMoveFor === img.id && (
                      <div className="absolute right-0 top-5 z-20 min-w-[160px] rounded border border-neutral-200 bg-white p-1 shadow">
                        {moveTargets.length === 0 && (
                          <p className="px-2 py-1 text-xs text-neutral-400">No other sections</p>
                        )}
                        {moveTargets.map((t) => (
                          <button
                            key={t.label}
                            type="button"
                            onClick={() => void handleMove(img.id, t.tag)}
                            className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-neutral-100"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
