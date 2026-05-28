export interface ProductVariant {
  id?: string;
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'Free';
  colour_id: string | null;
  custom_colour: string | null;
  quantity: number;
  location_id: string | null;
}

export interface ProductImage {
  id: string;
  public_url: string;
  storage_path: string;
  sort_order: number;
  colour_id: string | null;
  custom_colour: string | null;
}

export interface ProductBrand        { id: string; name: string; slug: string; logo_url: string | null; }
export interface ProductCategoryRef  { id: string; name: string; slug: string; }
export interface ProductMaterialRef  { id: string; name: string; slug: string; }
export interface ProductColourRef    { id: string; name: string; slug: string; hex: string; }
export interface ProductLocationRef  { id: string; name: string; slug: string; }
export interface ProductLookRef      { id: string; name: string; slug: string; is_primary: boolean; collection: { id: string; name: string; slug: string; }; }

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  status: 'draft' | 'published';
  brand_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  sub_subcategory_id: string | null;
  material_id: string | null;
  fabric_details: string | null;
  description: string | null;
  retail_price_minor: number;
  rent_price_minor: number | null;
  currency: string;
  created_at: string;
  updated_at: string;

  brand: ProductBrand | null;
  category: ProductCategoryRef | null;
  subcategory: ProductCategoryRef | null;
  sub_subcategory: ProductCategoryRef | null;
  material: ProductMaterialRef | null;

  variants: Array<{
    id: string;
    size: ProductVariant['size'];
    colour: ProductColourRef | null;
    custom_colour: string | null;
    quantity: number;
    location: ProductLocationRef | null;
  }>;
  images: ProductImage[];
  looks: ProductLookRef[];
}

export interface ProductPayload {
  name: string;
  sku: string | null;
  brand_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  sub_subcategory_id: string | null;
  material_id: string | null;
  fabric_details: string | null;
  description: string | null;
  retail_price_minor: number;
  rent_price_minor: number | null;
  currency: string;
  status: 'draft' | 'published';
  variants: ProductVariant[];
  look_ids: string[];
}

export type BatchProductPayload = ProductPayload & { image_urls?: string[] };

export interface ProductListQuery {
  q?: string;
  status?: 'draft' | 'published';
  brand_id?: string;
  category_id?: string;
  subcategory_id?: string;
  sub_subcategory_id?: string;
  material_id?: string;
  colour_id?: string;
  look_id?: string;
  collection_id?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
}

export type SuggestionField =
  | 'brand'
  | 'category'
  | 'collection'
  | 'fabric'
  | 'colour'
  | 'location';
