'use client';

import useSWR, { mutate } from 'swr';

export function invalidateTaxonomyCache() {
  mutate(
    (key) =>
      Array.isArray(key) &&
      ['brands', 'collections', 'looks', 'materials', 'colours', 'locations'].includes(key[0]),
    undefined,
    { revalidate: true }
  );
  mutate('categoryTree', undefined, { revalidate: true });
}
import {
  Brands,
  Collections,
  Looks,
  Categories,
  Materials,
  Colours,
  Locations,
} from '@/lib/taxonomy-api';
import type {
  Brand,
  Collection,
  Look,
  CategoryTreeNode,
  Material,
  LocationT,
  Colour,
} from '@/types/taxonomy';

export function useBrands(q?: string) {
  return useSWR<Brand[]>(['brands', q], () => Brands.list(q).then((r) => r.items));
}

export function useCollections(q?: string) {
  return useSWR<Collection[]>(['collections', q], () =>
    Collections.list(q).then((r) => r.items)
  );
}

export function useLooksFor(collectionId: string | null) {
  return useSWR<Look[]>(collectionId ? ['looks', collectionId] : null, () =>
    collectionId ? Looks.listFor(collectionId).then((r) => r.items) : []
  );
}

export function useCategoryTree() {
  return useSWR<CategoryTreeNode[]>('categoryTree', () =>
    Categories.tree().then((r) => r.tree)
  );
}

export function useMaterials(q?: string) {
  return useSWR<Material[]>(['materials', q], () =>
    Materials.list(q).then((r) => r.items)
  );
}

export function useColours(q?: string) {
  return useSWR<Colour[]>(['colours', q], () => Colours.list(q).then((r) => r.items));
}

export function useLocations(q?: string) {
  return useSWR<LocationT[]>(['locations', q], () =>
    Locations.list(q).then((r) => r.items)
  );
}

export function useTaxonomy() {
  const { data: brands = [], isLoading: brandsLoading } = useBrands();
  const { data: collections = [], isLoading: collectionsLoading } = useCollections();
  const { data: tree = [], isLoading: treeLoading } = useCategoryTree();
  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const { data: colours = [], isLoading: coloursLoading } = useColours();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();

  return {
    brands,
    collections,
    tree,
    materials,
    colours,
    locations,
    loading: brandsLoading || collectionsLoading || treeLoading || materialsLoading || coloursLoading || locationsLoading,
  };
}
