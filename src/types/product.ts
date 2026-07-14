export interface ProductVariant {
  id?: string;
  product_id?: string;
  size: string;
  colour: string | null;
  quantity: number;
  location: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  public_url: string;
  source_url: string | null;
  alt: string | null;
  sort_order: number;
  colour_id: string | null;
  custom_colour: string | null;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  retail_price_minor: number;
  rent_price_minor: number | null;
  currency: string;
  category: string | null;
  collection: string | null;
  fabric: string | null;
  description: string | null;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface ProductPayload {
  name: string;
  brand: string | null;
  retail_price_minor: number;
  rent_price_minor: number | null;
  currency: string;
  category: string | null;
  collection: string | null;
  fabric: string | null;
  description: string | null;
  status: 'draft' | 'published';
  variants: ProductVariant[];
}

export interface BatchProductPayload extends ProductPayload {
  image_urls: string[];
}

export interface ProductListQuery {
  q?: string;
  brand?: string;
  category?: string;
  status?: 'draft' | 'published' | 'all';
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
}

export type SuggestionField = 'brand' | 'category' | 'collection' | 'fabric' | 'colour' | 'location';
