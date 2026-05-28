import type { BatchRowPayload } from '@/types/product';

export const CSV_COLUMNS = [
  'name',
  'sku',
  'brand',
  'category_type',
  'subcategory',
  'sub_subcategory',
  'material',
  'fabric_details',
  'description',
  'retail_price_minor',
  'rent_price_minor',
  'currency',
  'look_slugs',
  'variants_json',
  'image_urls',
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];
export type CsvRow = { [K in CsvColumn]: string };

export interface GroupingError {
  rowIndex: number;
  message: string;
}

export interface GroupingResult {
  products: BatchRowPayload[];
  errors: GroupingError[];
}

export const EXPECTED_COLUMNS = [
  'name', 'sku', 'brand', 'category_type', 'subcategory', 'sub_subcategory',
  'material', 'fabric_details', 'description',
  'retail_price_minor', 'rent_price_minor', 'currency',
  'look_slugs', 'variants_json', 'image_urls',
];

export function groupRowsIntoProducts(rows: CsvRow[]): GroupingResult {
  const products: BatchRowPayload[] = [];
  const errors: GroupingError[] = [];

  rows.forEach((r, i) => {
    if (!r.name?.trim()) {
      errors.push({ rowIndex: i, message: 'name is required' });
      return;
    }
    products.push({
      name: r.name?.trim() ?? '',
      sku: r.sku?.trim() || null,
      brand_slug: r.brand?.trim() || undefined,
      category_type_slug: r.category_type?.trim() || undefined,
      subcategory_slug: r.subcategory?.trim() || undefined,
      sub_subcategory_slug: r.sub_subcategory?.trim() || undefined,
      material_slug: r.material?.trim() || undefined,
      fabric_details: r.fabric_details?.trim() || null,
      description: r.description?.trim() || null,
      retail_price_minor: Number(r.retail_price_minor || 0),
      rent_price_minor: r.rent_price_minor ? Number(r.rent_price_minor) : null,
      currency: r.currency?.trim() || 'INR',
      look_slugs: (r.look_slugs ?? '').split('|').map((s) => s.trim()).filter(Boolean),
      variants: r.variants_json ? JSON.parse(r.variants_json) : [],
      image_urls: (r.image_urls ?? '').split('|').map((s) => s.trim()).filter(Boolean),
    });
  });

  return { products, errors };
}
