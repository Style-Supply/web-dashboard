import { request } from './api';
import type {
  Brand,
  Collection,
  Look,
  Category,
  CategoryTreeNode,
  Material,
  LocationT,
  Colour,
} from '@/types/taxonomy';

type ListResp<T> = { items: T[]; total: number };

const list = <T>(path: string, q?: string) =>
  request<ListResp<T>>(`/api/admin/${path}${q ? `?q=${encodeURIComponent(q)}` : ''}`);

const create = <T>(path: string, body: unknown) =>
  request<T>(`/api/admin/${path}`, { method: 'POST', body: JSON.stringify(body) });

const update = <T>(path: string, id: string, body: unknown) =>
  request<T>(`/api/admin/${path}/${id}`, { method: 'PATCH', body: JSON.stringify(body) });

const remove = (path: string, id: string) =>
  request<void>(`/api/admin/${path}/${id}`, { method: 'DELETE' });

export const Brands = {
  list: (q?: string) => list<Brand>('brands', q),
  create: (b: Partial<Brand>) => create<Brand>('brands', b),
  update: (id: string, b: Partial<Brand>) => update<Brand>('brands', id, b),
  remove: (id: string) => remove('brands', id),
};

export const Collections = {
  list: (q?: string) => list<Collection>('collections', q),
  create: (b: Partial<Collection>) => create<Collection>('collections', b),
  update: (id: string, b: Partial<Collection>) => update<Collection>('collections', id, b),
  remove: (id: string) => remove('collections', id),
};

export const Looks = {
  listFor: (collectionId: string) =>
    request<ListResp<Look>>(`/api/admin/looks?collection_id=${collectionId}`),
  create: (b: Partial<Look>) => create<Look>('looks', b),
  update: (id: string, b: Partial<Look>) => update<Look>('looks', id, b),
  remove: (id: string) => remove('looks', id),
};

export const Categories = {
  tree: () => request<{ tree: CategoryTreeNode[] }>('/api/admin/categories/tree'),
  list: (level?: 1 | 2 | 3, parentId?: string) => {
    const params = new URLSearchParams();
    if (level) params.set('level', String(level));
    if (parentId) params.set('parent_id', parentId);
    const qs = params.toString();
    return request<ListResp<Category>>(`/api/admin/categories${qs ? `?${qs}` : ''}`);
  },
  create: (b: Partial<Category>) => create<Category>('categories', b),
  update: (id: string, b: Partial<Category>) => update<Category>('categories', id, b),
  remove: (id: string) => remove('categories', id),
};

export const Materials = {
  list: (q?: string) => list<Material>('materials', q),
  create: (b: Partial<Material>) => create<Material>('materials', b),
  update: (id: string, b: Partial<Material>) => update<Material>('materials', id, b),
  remove: (id: string) => remove('materials', id),
};

export const Colours = {
  list: (q?: string) => list<Colour>('colours', q),
  create: (b: Partial<Colour>) => create<Colour>('colours', b),
  update: (id: string, b: Partial<Colour>) => update<Colour>('colours', id, b),
  remove: (id: string) => remove('colours', id),
};

export const Locations = {
  list: (q?: string) => list<LocationT>('locations', q),
  create: (b: Partial<LocationT>) => create<LocationT>('locations', b),
  update: (id: string, b: Partial<LocationT>) => update<LocationT>('locations', id, b),
  remove: (id: string) => remove('locations', id),
};
