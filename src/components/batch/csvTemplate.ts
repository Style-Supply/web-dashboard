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

function getVal(row: Record<string, string>, keys: string[]): string {
  const normalizedRowKeys = new Map<string, string>();
  for (const k of Object.keys(row)) {
    if (k) normalizedRowKeys.set(k.trim().toLowerCase(), row[k]);
  }
  for (const k of keys) {
    const val = normalizedRowKeys.get(k.trim().toLowerCase());
    if (val !== undefined && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function parsePriceMinor(rawVal: string): number {
  if (!rawVal) return 0;
  const clean = rawVal.replace(/[^0-9.]/g, '');
  if (!clean) return 0;
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return 0;
  // If price is in Rupees (e.g. 54600 or 43200 or 1500), convert to minor units (paise)
  if (num < 100000) {
    return Math.round(num * 100);
  }
  return Math.round(num);
}

function normalizeSize(rawSize: string): 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'Free' {
  const upper = rawSize.trim().toUpperCase();
  if (['XS', 'EXTRA SMALL'].includes(upper)) return 'XS';
  if (['S', 'SMALL'].includes(upper)) return 'S';
  if (['M', 'MEDIUM'].includes(upper)) return 'M';
  if (['L', 'LARGE'].includes(upper)) return 'L';
  if (['XL', 'EXTRA LARGE'].includes(upper)) return 'XL';
  if (['XXL', '2XL', 'DOUBLE EXTRA LARGE'].includes(upper)) return 'XXL';
  return 'Free';
}

export function groupRowsIntoProducts(rows: Record<string, string>[]): GroupingResult {
  const productMap = new Map<string, BatchRowPayload>();
  const errors: GroupingError[] = [];

  rows.forEach((r, i) => {
    const name = getVal(r, ['name', 'product_name', 'title']);
    if (!name) {
      errors.push({ rowIndex: i + 1, message: 'name is required' });
      return;
    }

    const sku = getVal(r, ['sku', 'product_sku']);
    const key = sku ? sku.toLowerCase() : name.toLowerCase();

    const brand = getVal(r, ['brand', 'brand_slug', 'brand_name']);
    const catType = getVal(r, ['category_type', 'category', 'category_slug', 'category_type_slug']);
    const subCat = getVal(r, ['subcategory', 'sub_category', 'subcategory_slug']);
    const subSubCat = getVal(r, ['sub_subcategory', 'sub_sub_category', 'sub_subcategory_slug']);
    const material = getVal(r, ['material', 'fabric', 'material_slug']);
    const fabricDetails = getVal(r, ['fabric_details', 'fabric_detail']);
    const description = getVal(r, ['description', 'desc']);

    const retailPriceStr = getVal(r, ['retail_price_minor', 'retail_price', 'retail_price_inr', 'retail', 'mrp', 'price']);
    const rentPriceStr = getVal(r, ['rent_price_minor', 'rent_price', 'rent_price_inr', 'rent', 'rental_price']);
    const currency = getVal(r, ['currency']) || 'INR';

    const lookSlugsStr = getVal(r, ['look_slugs', 'looks', 'look']);
    const lookSlugs = lookSlugsStr ? lookSlugsStr.split(/[|;]/).map((s) => s.trim()).filter(Boolean) : [];

    const imageUrlsStr = getVal(r, ['image_urls', 'images', 'image_url', 'image', 'photos']);
    const imageUrls = imageUrlsStr ? imageUrlsStr.split(/[|;,]/).map((s) => s.trim()).filter(Boolean) : [];

    // Parse variants
    let variants: BatchRowPayload['variants'] = [];
    const variantsJson = getVal(r, ['variants_json', 'variants']);
    if (variantsJson) {
      try {
        const parsed = JSON.parse(variantsJson);
        if (Array.isArray(parsed)) {
          variants = parsed.map((v: any) => ({
            size: normalizeSize(v.size || 'Free'),
            colour_slug: v.colour_slug || null,
            custom_colour: v.custom_colour || v.colour || v.color || null,
            quantity: Number(v.quantity || 1),
            location_slug: v.location_slug || v.location || null,
          }));
        }
      } catch {
        // Fallback to row columns if JSON parse fails
      }
    }

    if (variants.length === 0) {
      const vSize = getVal(r, ['variant_size', 'size', 'sizes']);
      const vColour = getVal(r, ['variant_colour', 'variant_color', 'colour', 'color', 'custom_colour']);
      const vQtyStr = getVal(r, ['variant_quantity', 'variant_qty', 'quantity', 'qty']);
      const vLoc = getVal(r, ['variant_location', 'location']);

      if (vSize || vColour || vQtyStr || vLoc) {
        variants.push({
          size: normalizeSize(vSize || 'Free'),
          custom_colour: vColour || null,
          quantity: vQtyStr ? parseInt(vQtyStr, 10) || 1 : 1,
          location_slug: vLoc || null,
        });
      }
    }

    if (productMap.has(key)) {
      const existing = productMap.get(key)!;
      if (variants.length > 0) {
        if (!existing.variants) existing.variants = [];
        existing.variants.push(...variants);
      }
      if (imageUrls.length > 0) {
        const set = new Set([...(existing.image_urls || []), ...imageUrls]);
        existing.image_urls = Array.from(set);
      }
    } else {
      productMap.set(key, {
        name,
        sku: sku || null,
        brand_slug: brand || undefined,
        category_type_slug: catType || undefined,
        subcategory_slug: subCat || undefined,
        sub_subcategory_slug: subSubCat || undefined,
        material_slug: material || undefined,
        fabric_details: fabricDetails || null,
        description: description || null,
        retail_price_minor: parsePriceMinor(retailPriceStr),
        rent_price_minor: rentPriceStr ? parsePriceMinor(rentPriceStr) : null,
        currency,
        look_slugs: lookSlugs,
        variants,
        image_urls: imageUrls,
      });
    }
  });

  return { products: Array.from(productMap.values()), errors };
}
