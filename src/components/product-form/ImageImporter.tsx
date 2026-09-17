'use client';

import { useState } from 'react';
import type { ProductImage, ProductVariant } from '@/types/product';
import type { ColourTag } from '@/lib/api';
import { reorderImages } from '@/lib/api';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import ImageColourSection, { type SectionKind } from './ImageColourSection';

export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free'] as const;

interface ImageImporterProps {
  productId: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
  onImagesChange: (next: ProductImage[]) => void;
}

interface DerivedSection {
  key: string;
  kind: SectionKind;
  match: (img: ProductImage) => boolean;
  tag: ColourTag;
  label: string;
}

function getAvailableSizes(variants: ProductVariant[]): string[] {
  const sizesSet = new Set<string>();
  for (const v of variants) {
    if (v.size?.trim()) sizesSet.add(v.size.trim());
  }
  if (sizesSet.size === 0) return [...STANDARD_SIZES];
  const known = STANDARD_SIZES.filter((s) => sizesSet.has(s));
  const others = Array.from(sizesSet).filter((s) => !(STANDARD_SIZES as readonly string[]).includes(s)).sort();
  return [...known, ...others];
}

function buildColourSections(
  variants: ProductVariant[],
  colours: { id: string; name: string; hex: string }[],
  images: ProductImage[],
): DerivedSection[] {
  const seenColourIds = new Set<string>();
  const seenCustomLower = new Set<string>();
  const sections: DerivedSection[] = [];

  for (const v of variants) {
    if (v.colour_id && !seenColourIds.has(v.colour_id)) {
      seenColourIds.add(v.colour_id);
      const c = colours.find((x) => x.id === v.colour_id);
      const name = c?.name ?? 'Unknown';
      const hex = c?.hex ?? '#888';
      sections.push({
        key: `c:${v.colour_id}`,
        kind: { type: 'colour', colour_id: v.colour_id, name, hex },
        match: (img) => img.colour_id === v.colour_id,
        tag: { colour_id: v.colour_id, custom_colour: null },
        label: name,
      });
    } else if (v.custom_colour) {
      const lower = v.custom_colour.trim().toLowerCase();
      if (lower && !seenCustomLower.has(lower)) {
        seenCustomLower.add(lower);
        sections.push({
          key: `x:${lower}`,
          kind: { type: 'custom', custom_colour: v.custom_colour.trim() },
          match: (img) =>
            img.colour_id === null &&
            (img.custom_colour ?? '').trim().toLowerCase() === lower,
          tag: { colour_id: null, custom_colour: v.custom_colour.trim() },
          label: `Custom: ${v.custom_colour.trim()}`,
        });
      }
    }
  }

  const hasUnassignedImages = images.some(
    (img) => img.colour_id === null && img.custom_colour === null,
  );
  if (sections.length === 0 || hasUnassignedImages) {
    sections.push({
      key: 'unassigned',
      kind: { type: 'unassigned' },
      match: (img) => img.colour_id === null && img.custom_colour === null,
      tag: { colour_id: null, custom_colour: null },
      label: 'Unassigned / All colours',
    });
  }

  return sections;
}

function buildSizeSections(
  availableSizes: string[],
  images: ProductImage[],
): DerivedSection[] {
  const sections: DerivedSection[] = [];

  for (const sz of availableSizes) {
    sections.push({
      key: `s:${sz}`,
      kind: { type: 'size', size: sz },
      match: (img) => (img.sizes ?? []).includes(sz),
      tag: { sizes: [sz] },
      label: `Size ${sz}`,
    });
  }

  // All sizes / untagged section
  sections.push({
    key: 's:all',
    kind: { type: 'size_all' },
    match: (img) => !img.sizes || img.sizes.length === 0,
    tag: { sizes: [] },
    label: 'All Sizes / Shared',
  });

  return sections;
}

export default function ImageImporter({
  productId,
  variants,
  images,
  onImagesChange,
}: ImageImporterProps): React.ReactElement {
  const { colours } = useTaxonomy();
  const [groupMode, setGroupMode] = useState<'colour' | 'size'>('colour');

  if (productId === null) {
    return (
      <div className="rounded border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
        Save the draft first to attach images.
      </div>
    );
  }

  const id = productId;
  const availableSizes = getAvailableSizes(variants);

  const sections =
    groupMode === 'colour'
      ? buildColourSections(variants, colours, images)
      : buildSizeSections(availableSizes, images);

  const onlyUnassigned =
    groupMode === 'colour' && sections.length === 1 && sections[0].kind.type === 'unassigned';

  // Helper: re-flatten and persist global sort order whenever composition changes.
  function commit(reflattened: ProductImage[]): void {
    const reindexed = reflattened.map((img, idx) => ({ ...img, sort_order: idx }));
    onImagesChange(reindexed);
    void reorderImages(id, reindexed.map((i) => i.id));
  }

  const sortedGlobal = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const sectionImages = new Map<string, ProductImage[]>();
  for (const s of sections) {
    sectionImages.set(s.key, sortedGlobal.filter(s.match));
  }

  function handleAppend(sectionKey: string, added: ProductImage[]): void {
    const nextGlobal = [...sortedGlobal, ...added];
    commit(nextGlobal);
  }

  function handleReorderSection(sectionKey: string, newOrderIds: string[]): void {
    const current = sectionImages.get(sectionKey) ?? [];
    const byId = new Map(sortedGlobal.map((i) => [i.id, i]));
    const sectionIdSet = new Set(current.map((i) => i.id));
    const reorderedSectionImages = newOrderIds
      .map((iId) => byId.get(iId))
      .filter((i): i is ProductImage => Boolean(i));

    let sectionIdx = 0;
    const nextGlobal = sortedGlobal.map((img) => {
      if (sectionIdSet.has(img.id)) {
        const replacement = reorderedSectionImages[sectionIdx++];
        return replacement ?? img;
      }
      return img;
    });
    commit(nextGlobal);
  }

  function handleUpdateImage(imageId: string, patch: Partial<ProductImage>): void {
    const nextGlobal = sortedGlobal.map((i) => (i.id === imageId ? { ...i, ...patch } : i));
    commit(nextGlobal);
  }

  function handleDeleteImage(imageId: string): void {
    const nextGlobal = sortedGlobal.filter((i) => i.id !== imageId);
    commit(nextGlobal);
  }

  return (
    <div className="space-y-4">
      {/* Top Grouping Mode Switcher */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Image Organization
          </span>
          <p className="text-xs text-neutral-500">
            Upload & tag images by colour or by size. Multiple sizes can share the same image.
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-neutral-100 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setGroupMode('colour')}
            className={`rounded-md px-3 py-1.5 transition-all ${
              groupMode === 'colour'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Group by Colour
          </button>
          <button
            type="button"
            onClick={() => setGroupMode('size')}
            className={`rounded-md px-3 py-1.5 transition-all ${
              groupMode === 'size'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Group by Size
          </button>
        </div>
      </div>

      {onlyUnassigned && (
        <div className="rounded border border-dashed border-neutral-300 bg-neutral-50 p-3 text-xs text-neutral-600">
          Add a variant with a colour above to upload images per colour, or switch to “Group by Size”.
        </div>
      )}

      {sections.map((s) => {
        const moveTargets = sections
          .filter((other) => other.key !== s.key)
          .map((other) => ({ label: other.label, tag: other.tag }));
        return (
          <ImageColourSection
            key={s.key}
            productId={id}
            kind={s.kind}
            images={sectionImages.get(s.key) ?? []}
            availableSizes={availableSizes}
            moveTargets={moveTargets}
            onAppendImages={(added) => handleAppend(s.key, added)}
            onReorderSection={(ids) => handleReorderSection(s.key, ids)}
            onUpdateImage={handleUpdateImage}
            onDeleteImage={handleDeleteImage}
          />
        );
      })}
    </div>
  );
}
