'use client';

import { useState, useRef } from 'react';
import type { ProductImage } from '@/types/product';
import { updateImage, replaceImageFile, deleteImage } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ColourOption {
  id: string | null;
  name: string;
  hex: string | null;
  custom_colour: string | null;
}

interface EditImageModalProps {
  productId: string;
  image: ProductImage;
  availableSizes: string[];
  colourOptions: ColourOption[];
  onClose: () => void;
  onUpdateImage: (imageId: string, patch: Partial<ProductImage>) => void;
  onDeleteImage: (imageId: string) => void;
}

export default function EditImageModal({
  productId,
  image,
  availableSizes,
  colourOptions,
  onClose,
  onUpdateImage,
  onDeleteImage,
}: EditImageModalProps): React.ReactElement {
  const [selectedSizes, setSelectedSizes] = useState<string[]>(image.sizes ?? []);
  const [colourMode, setColourMode] = useState<'none' | 'preset' | 'custom'>(() => {
    if (image.colour_id) return 'preset';
    if (image.custom_colour) return 'custom';
    return 'none';
  });
  const [selectedColourId, setSelectedColourId] = useState<string | null>(image.colour_id);
  const [customColourText, setCustomColourText] = useState<string>(image.custom_colour ?? '');
  const [altText, setAltText] = useState<string>(image.alt ?? '');
  const [currentPublicUrl, setCurrentPublicUrl] = useState<string>(image.public_url);
  const [currentStoragePath, setCurrentStoragePath] = useState<string>(image.storage_path);

  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleSize(sz: string) {
    setSelectedSizes((prev) =>
      prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
    );
  }

  function handleSelectAllSizes() {
    setSelectedSizes([...availableSizes]);
  }

  function handleClearSizes() {
    setSelectedSizes([]);
  }

  async function handleFileReplace(file: File) {
    setReplacing(true);
    try {
      const res = await replaceImageFile(productId, file);
      setCurrentPublicUrl(res.public_url);
      setCurrentStoragePath(res.storage_path);
    } catch (err) {
      alert(`Failed to replace image: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setReplacing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const colour_id = colourMode === 'preset' ? selectedColourId : null;
      const custom_colour = colourMode === 'custom' && customColourText.trim() ? customColourText.trim() : null;

      const patch = {
        sizes: selectedSizes,
        colour_id,
        custom_colour,
        alt: altText.trim() || null,
        public_url: currentPublicUrl,
        storage_path: currentStoragePath,
      };

      const updated = await updateImage(image.id, patch);
      onUpdateImage(image.id, updated);
      onClose();
    } catch (err) {
      alert(`Failed to save image changes: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this image?')) return;
    setDeleting(true);
    try {
      await deleteImage(image.id);
      onDeleteImage(image.id);
      onClose();
    } catch (err) {
      alert(`Failed to delete image: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/70">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Edit Product Image</h2>
            <p className="text-xs text-neutral-500">Configure size tags, colour association, and details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top section: Preview + Replace */}
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center bg-neutral-50 border border-neutral-200/80 rounded-xl p-4">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentPublicUrl} alt={altText || 'Preview'} className="h-full w-full object-cover" />
              {replacing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-medium">
                  Uploading…
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFileReplace(f);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={replacing}
                  disabled={replacing || saving || deleting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Replace Image File
                </Button>
                <a
                  href={currentPublicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-neutral-500 hover:text-neutral-800 underline px-1"
                >
                  View full image ↗
                </a>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono break-all truncate max-w-sm">
                Path: {currentStoragePath}
              </p>
            </div>
          </div>

          {/* Section 1: Sizes Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider">
                  Applicable Sizes
                </label>
                <p className="text-xs text-neutral-500">
                  Select all sizes that display this photo. Multiple sizes can share this image.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllSizes}
                  className="text-neutral-600 hover:text-black font-medium underline"
                >
                  Select All
                </button>
                <span className="text-neutral-300">|</span>
                <button
                  type="button"
                  onClick={handleClearSizes}
                  className="text-neutral-500 hover:text-black underline"
                >
                  All Sizes (None tagged)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {availableSizes.map((sz) => {
                const active = selectedSizes.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm ring-2 ring-neutral-900/20'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300'
                    }`}
                  >
                    Size {sz} {active ? '✓' : ''}
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg bg-neutral-100/70 px-3 py-2 text-[11px] text-neutral-600">
              {selectedSizes.length > 0 ? (
                <span>
                  Active on <strong>{selectedSizes.length}</strong> size{selectedSizes.length === 1 ? '' : 's'}:{' '}
                  <span className="font-semibold text-neutral-800">{selectedSizes.join(', ')}</span>
                </span>
              ) : (
                <span>
                  ℹ️ No specific sizes selected: this image is <strong>shared across all sizes</strong>.
                </span>
              )}
            </div>
          </div>

          {/* Section 2: Colour Assignment */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider">
              Assigned Colour
            </label>
            <p className="text-xs text-neutral-500">
              Assign this image to a specific colour variant or make it available to all colours.
            </p>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="radio"
                  name="colourOption"
                  checked={colourMode === 'none'}
                  onChange={() => {
                    setColourMode('none');
                    setSelectedColourId(null);
                  }}
                  className="text-neutral-900 focus:ring-neutral-900"
                />
                <span>Unassigned / Shared across all colours</span>
              </label>

              {colourOptions.filter((c) => c.id).map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                  <input
                    type="radio"
                    name="colourOption"
                    checked={colourMode === 'preset' && selectedColourId === c.id}
                    onChange={() => {
                      setColourMode('preset');
                      setSelectedColourId(c.id);
                    }}
                    className="text-neutral-900 focus:ring-neutral-900"
                  />
                  {c.hex && (
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border border-neutral-300 shadow-xs"
                      style={{ backgroundColor: c.hex }}
                    />
                  )}
                  <span>{c.name}</span>
                </label>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer shrink-0">
                  <input
                    type="radio"
                    name="colourOption"
                    checked={colourMode === 'custom'}
                    onChange={() => {
                      setColourMode('custom');
                      setSelectedColourId(null);
                    }}
                    className="text-neutral-900 focus:ring-neutral-900"
                  />
                  <span>Custom colour:</span>
                </label>
                {colourMode === 'custom' && (
                  <input
                    type="text"
                    value={customColourText}
                    onChange={(e) => setCustomColourText(e.target.value)}
                    placeholder="e.g. Metallic Gold"
                    className="flex-1 rounded-md border border-neutral-300 px-2.5 py-1 text-xs focus:border-neutral-900 focus:outline-hidden"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Alt Text / SEO */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider">
              Alt Text / Description (SEO)
            </label>
            <Input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Descriptive alt text for accessibility and search engines"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4 bg-neutral-50/70">
          <button
            type="button"
            disabled={saving || deleting || replacing}
            onClick={() => void handleDelete()}
            className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete Image'}
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving || deleting || replacing}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              disabled={saving || deleting || replacing}
              onClick={() => void handleSave()}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
