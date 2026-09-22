import { useRef, useState } from 'react';
import type { ProductImage, ImageTag } from '@/types/product';
import {
  importImagesFromUrls,
  scrapeImagesFromPage,
  uploadImages,
  retagImage,
  updateImageSizes,
  updateImageTag,
  deleteImage,
  type ColourTag,
} from '@/lib/api';
import { isLikelyHttpUrl } from '@/lib/url-check';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import EditImageModal from './EditImageModal';

export type SectionKind =
  | { type: 'colour'; colour_id: string; name: string; hex: string }
  | { type: 'custom'; custom_colour: string }
  | { type: 'unassigned' }
  | { type: 'size'; size: string }
  | { type: 'size_all' };

interface MoveTarget {
  label: string;
  tag: ColourTag;
}

interface Props {
  productId: string;
  kind: SectionKind;
  /** Images filtered to this section, in the user's drag order. */
  images: ProductImage[];
  /** Available sizes from variants */
  availableSizes?: string[];
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
  if (kind.type === 'size') return { sizes: [kind.size] };
  if (kind.type === 'size_all') return { sizes: [] };
  return { colour_id: null, custom_colour: null };
}

function headerLabel(kind: SectionKind): string {
  if (kind.type === 'colour') return kind.name;
  if (kind.type === 'custom') return `Custom: ${kind.custom_colour}`;
  if (kind.type === 'size') return `Size: ${kind.size}`;
  if (kind.type === 'size_all') return 'All Sizes / Shared';
  return 'Unassigned / All colours';
}

export default function ImageColourSection({
  productId,
  kind,
  images,
  availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'],
  moveTargets,
  onAppendImages,
  onReorderSection,
  onUpdateImage,
  onDeleteImage,
}: Props): React.ReactElement {
  const tag = tagForKind(kind);
  const [mode, setMode] = useState<Mode>('upload');
  const [uploadTag, setUploadTag] = useState<ImageTag>('BRAND IMAGE');
  const [urlText, setUrlText] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [busy, setBusy] = useState<false | 'url' | 'page' | 'upload'>(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [openMoveFor, setOpenMoveFor] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeUploadTag: ColourTag = { ...tag, image_tag: uploadTag };

  async function handleImportUrls(): Promise<void> {
    const urls = urlText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && isLikelyHttpUrl(s));
    if (urls.length === 0) return;
    setBusy('url');
    try {
      const result = await importImagesFromUrls(productId, urls, activeUploadTag);
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
      const result = await scrapeImagesFromPage(productId, url, undefined, activeUploadTag);
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
      const result = await uploadImages(productId, files, activeUploadTag);
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
          <span className="inline-block h-4 w-4 rounded-full border shadow-xs" style={{ backgroundColor: kind.hex }} />
        )}
        {kind.type === 'size' && (
          <span className="inline-flex h-5 items-center justify-center rounded bg-neutral-900 px-2 text-[11px] font-bold text-white shadow-xs">
            {kind.size}
          </span>
        )}
        <h3 className="text-sm font-semibold text-neutral-800">{headerLabel(kind)}</h3>
        <span className="ml-auto text-xs text-neutral-500">{images.length} image{images.length === 1 ? '' : 's'}</span>
      </header>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm flex-1 min-w-[240px]">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex-1 rounded px-3 py-1.5 ${mode === 'url' ? 'bg-white shadow-xs' : 'text-neutral-600'}`}
          >
            From URL
          </button>
          <button
            type="button"
            onClick={() => setMode('page')}
            className={`flex-1 rounded px-3 py-1.5 ${mode === 'page' ? 'bg-white shadow-xs' : 'text-neutral-600'}`}
          >
            From page
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex-1 rounded px-3 py-1.5 ${mode === 'upload' ? 'bg-white shadow-xs' : 'text-neutral-600'}`}
          >
            Upload
          </button>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-xs shadow-xs">
          <span className="text-neutral-500 font-medium">Tag new as:</span>
          <select
            value={uploadTag}
            onChange={(e) => setUploadTag(e.target.value as ImageTag)}
            className="bg-transparent font-bold text-neutral-800 outline-hidden cursor-pointer"
          >
            <option value="BRAND IMAGE">BRAND IMAGE</option>
            <option value="AI IMAGE">AI IMAGE</option>
            <option value="MEMBER IMAGE">MEMBER IMAGE</option>
          </select>
        </div>
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
                <button
                  type="button"
                  onClick={() => setEditingImage(img)}
                  className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow-sm text-neutral-600 hover:bg-white hover:text-black transition-all"
                  title="Edit image details"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <div
                  className="relative aspect-square overflow-hidden rounded bg-neutral-100 cursor-pointer group/thumb"
                  onClick={() => setEditingImage(img)}
                  title="Click to edit image"
                >
                  {img.public_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.public_url} alt={img.alt ?? ''} className="absolute inset-0 h-full w-full object-cover transition-transform group-hover/thumb:scale-105" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white shadow-xs">
                      Edit
                    </span>
                  </div>
                  <div className="absolute left-1 bottom-1 z-10 pointer-events-none">
                    <span className="rounded bg-black/75 px-1.5 py-0.5 text-[8px] font-bold tracking-wider uppercase text-white shadow-xs backdrop-blur-xs">
                      {img.image_tag ?? 'BRAND IMAGE'}
                    </span>
                  </div>
                </div>
                {/* Image Tag assignment */}
                <div className="mt-2 border-t border-neutral-100 pt-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-neutral-700">Tag:</span>
                    <select
                      value={img.image_tag ?? 'BRAND IMAGE'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={async (e) => {
                        const nextTag = e.target.value as ImageTag;
                        onUpdateImage(img.id, { image_tag: nextTag });
                        try {
                          await updateImageTag(img.id, nextTag);
                        } catch (err) {
                          console.error('Failed to update image tag', err);
                        }
                      }}
                      className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-neutral-800 shadow-xs focus:border-neutral-900 focus:outline-hidden cursor-pointer"
                    >
                      <option value="BRAND IMAGE">BRAND IMAGE</option>
                      <option value="AI IMAGE">AI IMAGE</option>
                      <option value="MEMBER IMAGE">MEMBER IMAGE</option>
                    </select>
                  </div>
                </div>
                {/* Size assignment badges */}
                <div className="mt-1.5 border-t border-neutral-100 pt-1.5">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-neutral-500">
                    <span className="font-semibold text-neutral-700">Sizes:</span>
                    <span className="text-[9px] text-neutral-400">
                      {!img.sizes || img.sizes.length === 0 ? 'All sizes' : `${img.sizes.length} selected`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {availableSizes.map((sz) => {
                      const isSelected = img.sizes?.includes(sz) ?? false;
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const current = img.sizes ?? [];
                            const next = isSelected
                              ? current.filter((x) => x !== sz)
                              : [...current, sz];
                            onUpdateImage(img.id, { sizes: next });
                            try {
                              await updateImageSizes(img.id, next);
                            } catch (err) {
                              console.error('Failed to update image sizes', err);
                            }
                          }}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                            isSelected
                              ? 'bg-neutral-900 text-white shadow-xs'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                          title={isSelected ? `Remove size ${sz} from image` : `Tag image with size ${sz}`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                    {img.sizes && img.sizes.length > 0 && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          onUpdateImage(img.id, { sizes: [] });
                          try {
                            await updateImageSizes(img.id, []);
                          } catch (err) {
                            console.error('Failed to clear image sizes', err);
                          }
                        }}
                        className="px-1 text-[9px] text-neutral-400 hover:text-neutral-700 underline"
                        title="Set to apply to all sizes"
                      >
                        All
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2.5 text-[10px] text-neutral-500">
                  <button
                    type="button"
                    className="font-semibold text-neutral-700 hover:text-black hover:underline flex items-center gap-1"
                    onClick={() => setEditingImage(img)}
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
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

      {editingImage && (
        <EditImageModal
          productId={productId}
          image={editingImage}
          availableSizes={availableSizes}
          colourOptions={moveTargets.map((m) => ({
            id: m.tag.colour_id ?? null,
            name: m.label,
            hex: null,
            custom_colour: m.tag.custom_colour ?? null,
          }))}
          onClose={() => setEditingImage(null)}
          onUpdateImage={(id, patch) => {
            onUpdateImage(id, patch);
            setEditingImage((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
          }}
          onDeleteImage={(id) => {
            onDeleteImage(id);
            setEditingImage(null);
          }}
        />
      )}
    </section>
  );
}
