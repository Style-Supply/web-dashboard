import type { ProductPayload, ProductImage } from '@/types/product';
import { fromMinor } from '@/lib/price';

export interface PreviewProductProps {
  title: string;
  brand: string;
  originalPrice: number;
  currentPrice: number;
  description: string;
  images: { url: string; alt: string }[];
  sizeOptions: string[];
  unavailableSizes: string[];
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'];
const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="%23E5E5E5"/></svg>';

export function formStateToPreviewProduct(
  state: ProductPayload,
  images: ProductImage[],
): PreviewProductProps {
  const title = state.name || 'Untitled product';
  const brand = state.brand || '—';
  const originalPrice = fromMinor(state.retail_price_minor || 0);
  const currentPrice = fromMinor(state.rent_price_minor ?? state.retail_price_minor ?? 0);
  const description = state.description || '';

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const mapped = sorted.map((img) => ({
    url: img.public_url || img.source_url || PLACEHOLDER,
    alt: img.alt || state.name,
  }));
  const finalImages = mapped.length > 0 ? mapped : [{ url: PLACEHOLDER, alt: title }];

  const sizeSet = new Set<string>();
  const quantityBySize = new Map<string, number>();
  for (const v of state.variants) {
    if (!v.size) continue;
    sizeSet.add(v.size);
    quantityBySize.set(v.size, (quantityBySize.get(v.size) ?? 0) + v.quantity);
  }
  const sizeOptions = SIZE_ORDER.filter((s) => sizeSet.has(s));
  const unavailableSizes = sizeOptions.filter((s) => (quantityBySize.get(s) ?? 0) === 0);

  return {
    title,
    brand,
    originalPrice,
    currentPrice,
    description,
    images: finalImages,
    sizeOptions,
    unavailableSizes,
  };
}
