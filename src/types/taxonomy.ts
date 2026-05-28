export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  hero_url: string | null;
  description: string | null;
  tile_variant: 'image' | 'light' | 'logo';
  sort_order: number;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hero_url: string | null;
  tile_variant: 'image' | 'light' | 'featured';
  sort_order: number;
  looks?: Look[];
}

export interface Look {
  id: string;
  collection_id: string;
  name: string;
  slug: string;
  description: string | null;
  hero_url: string | null;
  sort_order: number;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  level: 1 | 2 | 3;
  sort_order: number;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export interface Material {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface LocationT {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface Colour {
  id: string;
  name: string;
  slug: string;
  hex: string;
  sort_order: number;
}
