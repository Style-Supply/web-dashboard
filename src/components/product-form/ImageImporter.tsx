'use client';

import type { ProductImage, ProductVariant } from '@/types/product';
import type { ColourTag } from '@/lib/api';
import { reorderImages } from '@/lib/api';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import ImageColourSection, { type SectionKind } from './ImageColourSection';

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

function buildSections(variants: ProductVariant[], colours: { id: string; name: string; hex: string }[]): DerivedSection[] {
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

  sections.push({
    key: 'unassigned',
    kind: { type: 'unassigned' },
    match: (img) => img.colour_id === null && img.custom_colour === null,
    tag: { colour_id: null, custom_colour: null },
    label: 'Unassigned / All colours',
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

  if (productId === null) {
    return (
      <div className="rounded border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
        Save the draft first to attach images.
      </div>
    );
  }

  const id = productId;
  const sections = buildSections(variants, colours);
  const onlyUnassigned = sections.length === 1; // means no variant colours

  // Helper: re-flatten and persist global sort order whenever section composition changes.
  function commit(reflattened: ProductImage[]): void {
    const reindexed = reflattened.map((img, idx) => ({ ...img, sort_order: idx }));
    onImagesChange(reindexed);
    void reorderImages(id, reindexed.map((i) => i.id));
  }

  // Build per-section image arrays in the user's current order. We derive
  // section image lists from the global `images` array, sorted by sort_order
  // ascending (which is how the backend gives them back).
  const sortedGlobal = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const sectionImages = new Map<string, ProductImage[]>();
  for (const s of sections) {
    sectionImages.set(s.key, sortedGlobal.filter(s.match));
  }

  function reflatten(updated: Map<string, ProductImage[]>): ProductImage[] {
    const out: ProductImage[] = [];
    for (const s of sections) out.push(...(updated.get(s.key) ?? []));
    return out;
  }

  function handleAppend(sectionKey: string, added: ProductImage[]): void {
    const updated = new Map(sectionImages);
    updated.set(sectionKey, [...(updated.get(sectionKey) ?? []), ...added]);
    commit(reflatten(updated));
  }

  function handleReorderSection(sectionKey: string, newOrderIds: string[]): void {
    const current = sectionImages.get(sectionKey) ?? [];
    const byId = new Map(current.map((i) => [i.id, i]));
    const reordered = newOrderIds.map((id) => byId.get(id)).filter((i): i is ProductImage => Boolean(i));
    const updated = new Map(sectionImages);
    updated.set(sectionKey, reordered);
    commit(reflatten(updated));
  }

  function handleUpdateImage(imageId: string, patch: Partial<ProductImage>): void {
    // Apply patch in the global list; recompute section membership by re-filtering.
    const nextGlobal = sortedGlobal.map((i) => (i.id === imageId ? { ...i, ...patch } : i));
    const updated = new Map<string, ProductImage[]>();
    for (const s of sections) updated.set(s.key, nextGlobal.filter(s.match));
    commit(reflatten(updated));
  }

  function handleDeleteImage(imageId: string): void {
    const nextGlobal = sortedGlobal.filter((i) => i.id !== imageId);
    const updated = new Map<string, ProductImage[]>();
    for (const s of sections) updated.set(s.key, nextGlobal.filter(s.match));
    commit(reflatten(updated));
  }

  return (
    <div className="space-y-4">
      {onlyUnassigned && (
        <div className="rounded border border-dashed border-neutral-300 bg-neutral-50 p-3 text-xs text-neutral-600">
          Add a variant with a colour to upload images per colour.
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
