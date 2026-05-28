import type { BatchProductPayload, ProductVariant } from '@/types/product';
import { toMinor } from '@/lib/price';

export const CSV_COLUMNS = [
  'name',
  'brand',
  'retail_price_inr',
  'rent_price_inr',
  'currency',
  'category',
  'collection',
  'fabric',
  'description',
  'status',
  'variant_size',
  'variant_colour',
  'variant_quantity',
  'variant_location',
  'image_urls',
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];
export type CsvRow = { [K in CsvColumn]: string };

export interface GroupingError {
  rowIndex: number;
  message: string;
}

export interface GroupingResult {
  products: BatchProductPayload[];
  errors: GroupingError[];
}

function variantFromRow(row: CsvRow): ProductVariant | null {
  if (!row.variant_size) return null;
  const size = row.variant_size.trim() as ProductVariant['size'];
  const validSizes: ProductVariant['size'][] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free'];
  if (!validSizes.includes(size)) return null;
  return {
    size,
    colour_id: null,
    custom_colour: row.variant_colour?.trim() || null,
    quantity: Number(row.variant_quantity) || 0,
    location_id: null,
  };
}

export function groupRowsIntoProducts(rows: CsvRow[]): GroupingResult {
  const products: BatchProductPayload[] = [];
  const errors: GroupingError[] = [];
  let current: BatchProductPayload | null = null;

  rows.forEach((row, i) => {
    const hasName = row.name && row.name.trim().length > 0;
    if (hasName) {
      if (current) products.push(current);
      const retail = Number(row.retail_price_inr);
      if (!Number.isFinite(retail)) {
        errors.push({ rowIndex: i, message: 'retail_price_inr is required and must be numeric' });
      }
      const rentRaw = row.rent_price_inr?.trim();
      const rent = rentRaw ? Number(rentRaw) : null;
      const status = row.status?.trim() === 'published' ? 'published' : 'draft';
      current = {
        name: row.name.trim(),
        sku: null,
        brand_id: null, // Will be resolved server-side in Phase 7
        category_id: null,
        subcategory_id: null,
        sub_subcategory_id: null,
        material_id: null,
        fabric_details: row.fabric?.trim() || null,
        description: row.description?.trim() || null,
        retail_price_minor: toMinor(Number.isFinite(retail) ? retail : 0),
        rent_price_minor: rent !== null && Number.isFinite(rent) ? toMinor(rent) : null,
        currency: row.currency?.trim() || 'INR',
        status,
        variants: [],
        look_ids: [],
        image_urls: (row.image_urls || '')
          .split('|')
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      };
    }
    if (!current) {
      errors.push({ rowIndex: i, message: 'Row has no preceding product' });
      return;
    }
    const variant = variantFromRow(row);
    if (variant) current.variants.push(variant);
  });

  if (current) products.push(current);

  products.forEach((p, i) => {
    if (p.variants.length === 0) {
      errors.push({ rowIndex: i, message: `Product "${p.name}" has no variants` });
    }
  });

  return { products, errors };
}
