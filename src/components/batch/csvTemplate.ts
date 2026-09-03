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
  'retail_price_inr',
  'rent_price_inr',
  'currency',
  'is_rentable',
  'is_buyable',
  'collection',
  'status',
  'variant_size',
  'variant_colour',
  'variant_quantity',
  'variant_location',
  'variant_sku',
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
  'name',
  'sku',
  'brand',
  'category_type',
  'subcategory',
  'sub_subcategory',
  'material',
  'fabric_details',
  'description',
  'retail_price_inr',
  'rent_price_inr',
  'currency',
  'is_rentable',
  'is_buyable',
  'collection',
  'status',
  'variant_size',
  'variant_colour',
  'variant_quantity',
  'variant_location',
  'variant_sku',
  'image_urls',
];

function getVal(row: Record<string, string>, keys: string[]): string {
  const normalizedRowKeys = new Map<string, string>();
  for (const k of Object.keys(row)) {
    if (k) {
      // Normalize key by stripping non-alphanumeric chars for maximum match flexibility
      const norm = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (norm) normalizedRowKeys.set(norm, row[k]);
    }
  }
  for (const k of keys) {
    const targetNorm = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const val = normalizedRowKeys.get(targetNorm);
    if (val !== undefined && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function parsePriceMinor(rawVal: string, isExplicitMinor = false): number {
  if (!rawVal) return 0;
  const clean = rawVal.replace(/[^0-9.]/g, '');
  if (!clean) return 0;
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return 0;
  if (isExplicitMinor) {
    return Math.round(num);
  }
  // Standard prices in Rupees (e.g. ₹1,800, ₹64,000, ₹1,50,000) converted to paise (* 100)
  if (num < 1000000) {
    return Math.round(num * 100);
  }
  return Math.round(num);
}

function normalizeSize(rawSize: string): string {
  if (!rawSize || !rawSize.trim()) return 'Free';
  const trimmed = rawSize.trim();
  const upper = trimmed.toUpperCase();
  if (['XS', 'EXTRA SMALL'].includes(upper)) return 'XS';
  if (['S', 'SMALL'].includes(upper)) return 'S';
  if (['M', 'MEDIUM'].includes(upper)) return 'M';
  if (['L', 'LARGE'].includes(upper)) return 'L';
  if (['XL', 'EXTRA LARGE'].includes(upper)) return 'XL';
  if (['XXL', '2XL', 'DOUBLE EXTRA LARGE'].includes(upper)) return 'XXL';
  if (['XXS', 'DOUBLE EXTRA SMALL'].includes(upper)) return 'XXS';
  if (['3XL', 'XXXL', 'TRIPLE EXTRA LARGE'].includes(upper)) return 'XXXL';
  if (['FREE SIZE', 'ONE SIZE', 'O/S', 'FS', 'STANDARD', 'ONESIZE', 'FREE'].includes(upper)) return 'Free';
  return trimmed;
}

export function groupRowsIntoProducts(rows: Record<string, string>[]): GroupingResult {
  const productMap = new Map<string, BatchRowPayload>();
  const errors: GroupingError[] = [];

  rows.forEach((r, i) => {
    const name = getVal(r, ['name', 'product_name', 'title', 'item_name']);
    if (!name) {
      errors.push({ rowIndex: i + 1, message: 'name is required' });
      return;
    }

    const sku = getVal(r, ['sku', 'product_sku', 'code', 'item_code']);
    
    // Find matching product by SKU or Name
    let matchedKey: string | undefined;
    if (sku && productMap.has(sku.toLowerCase())) {
      matchedKey = sku.toLowerCase();
    } else if (name && productMap.has(name.toLowerCase())) {
      matchedKey = name.toLowerCase();
    } else {
      for (const [k, p] of productMap.entries()) {
        if (sku && p.sku && p.sku.toLowerCase() === sku.toLowerCase()) {
          matchedKey = k;
          break;
        }
        if (name && p.name && p.name.toLowerCase() === name.toLowerCase()) {
          matchedKey = k;
          break;
        }
      }
    }
    const key = matchedKey || (sku ? sku.toLowerCase() : name.toLowerCase());

    const brand = getVal(r, ['brand', 'brand_slug', 'brand_name', 'designer', 'vendor', 'manufacturer']);
    const catType = getVal(r, ['category_type', 'category', 'category_slug', 'category_type_slug', 'main_category', 'gender', 'department', 'type']);
    const subCat = getVal(r, ['subcategory', 'sub_category', 'subcategory_slug', 'cat2', 'category2', 'sub_cat']);
    const subSubCat = getVal(r, ['sub_subcategory', 'sub_sub_category', 'sub_subcategory_slug', 'cat3', 'category3', 'sub_sub_cat', 'style']);
    const material = getVal(r, ['material', 'fabric', 'material_slug', 'material_name', 'composition', 'content']);
    const fabricDetails = getVal(r, ['fabric_details', 'fabric_detail', 'fabric_info', 'material_details', 'care', 'care_instructions']);
    const description = getVal(r, ['description', 'desc', 'details', 'product_description', 'about', 'body']);

    const retailMinorStr = getVal(r, ['retail_price_minor', 'retail_minor', 'price_minor']);
    const retailInrStr = getVal(r, ['retail_price_inr', 'retail_price', 'retail', 'mrp', 'price', 'original_price', 'retail_mrp']);
    const retailPriceMinor = retailMinorStr
      ? parsePriceMinor(retailMinorStr, true)
      : parsePriceMinor(retailInrStr, false);

    const rentMinorStr = getVal(r, ['rent_price_minor', 'rent_minor']);
    const rentInrStr = getVal(r, ['rent_price_inr', 'rent_price', 'rent', 'rental_price', 'rental']);
    const rentPriceMinor = rentMinorStr
      ? parsePriceMinor(rentMinorStr, true)
      : rentInrStr
      ? parsePriceMinor(rentInrStr, false)
      : null;

    const currency = getVal(r, ['currency', 'curr']) || 'INR';

    const isRentableStr = getVal(r, ['is_rentable', 'allow_rent', 'rentable', 'mode', 'fulfillment_type']);
    const isBuyableStr = getVal(r, ['is_buyable', 'allow_buy', 'buyable', 'sellable']);

    let isRentable = true;
    let isBuyable = true;

    if (isRentableStr) {
      const lower = isRentableStr.toLowerCase();
      if (['false', 'no', '0', 'buy_only', 'buy'].includes(lower)) {
        isRentable = false;
      }
    }
    if (isBuyableStr) {
      const lower = isBuyableStr.toLowerCase();
      if (['false', 'no', '0', 'rent_only', 'rent'].includes(lower)) {
        isBuyable = false;
      }
    }

    const lookSlugsStr = getVal(r, ['collection', 'collections', 'look_slugs', 'looks', 'look', 'look_names']);
    const lookSlugs = lookSlugsStr ? lookSlugsStr.split(/[|;,]/).map((s) => s.trim()).filter(Boolean) : [];

    const imageUrlsStr = getVal(r, ['image_urls', 'images', 'image_url', 'image', 'photos', 'picture_urls', 'urls', 'img']);
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
            colour_slug: v.colour_slug || v.colour || v.color || null,
            custom_colour: v.custom_colour || v.colour || v.color || null,
            quantity: Number(v.quantity ?? 1),
            location_slug: v.location_slug || v.location || null,
            sku: v.sku || v.variant_sku || null,
          }));
        }
      } catch {
        // Fallback to row columns if JSON parse fails
      }
    }

    if (variants.length === 0) {
      const vSize = getVal(r, ['variant_size', 'size', 'sizes', 'size_code', 'clothing_size']);
      const vColour = getVal(r, ['variant_colour', 'variant_color', 'colour', 'color', 'custom_colour', 'shade', 'color_name']);
      const vQtyStr = getVal(r, ['variant_quantity', 'variant_qty', 'quantity', 'qty', 'stock', 'inventory', 'count']);
      const vLoc = getVal(r, ['variant_location', 'location', 'warehouse', 'store', 'location_name']);
      const vSku = getVal(r, ['variant_sku', 'v_sku', 'sku_variant', 'varsku']);

      if (vSize || vColour || vQtyStr || vLoc || vSku) {
        variants.push({
          size: normalizeSize(vSize || 'Free'),
          colour_slug: vColour || null,
          custom_colour: vColour || null,
          quantity: vQtyStr ? parseInt(vQtyStr, 10) || 0 : 1,
          location_slug: vLoc || null,
          sku: vSku || null,
        });
      }
    }

    if (productMap.has(key)) {
      const existing = productMap.get(key)!;
      if (variants.length > 0) {
        existing.variants = [...(existing.variants || []), ...variants];
      }
      if (imageUrls.length > 0) {
        const set = new Set([...(existing.image_urls || []), ...imageUrls]);
        existing.image_urls = Array.from(set);
      }
      // Merge/fill any attributes if missing on previous row
      if (!existing.brand_slug && brand) existing.brand_slug = brand;
      if (!existing.category_type_slug && catType) existing.category_type_slug = catType;
      if (!existing.subcategory_slug && subCat) existing.subcategory_slug = subCat;
      if (!existing.sub_subcategory_slug && subSubCat) existing.sub_subcategory_slug = subSubCat;
      if (!existing.material_slug && material) existing.material_slug = material;
      if (!existing.fabric_details && fabricDetails) existing.fabric_details = fabricDetails;
      if (!existing.description && description) existing.description = description;
      if (!existing.retail_price_minor && retailPriceMinor) existing.retail_price_minor = retailPriceMinor;
      if (!existing.rent_price_minor && rentPriceMinor) existing.rent_price_minor = rentPriceMinor;
      if (lookSlugs.length > 0) {
        const set = new Set([...(existing.look_slugs || []), ...lookSlugs]);
        existing.look_slugs = Array.from(set);
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
        retail_price_minor: retailPriceMinor,
        rent_price_minor: rentPriceMinor,
        currency,
        is_rentable: isRentable,
        is_buyable: isBuyable,
        look_slugs: lookSlugs,
        variants,
        image_urls: imageUrls,
      });
    }
  });

  return { products: Array.from(productMap.values()), errors };
}

