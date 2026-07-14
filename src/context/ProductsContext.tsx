'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Product, ProductListQuery, ProductListResponse } from '@/types/product';
import { listProducts } from '@/lib/api';

interface ProductsContextType {
  products: Product[];
  total: number;
  query: ProductListQuery;
  loading: boolean;
  error: string | null;
  hasFetched: boolean;
  setQuery: (query: ProductListQuery | ((prev: ProductListQuery) => ProductListQuery)) => void;
  refresh: () => Promise<void>;
  invalidate: () => void;
}

const PAGE_SIZE = 50;

const ProductsContext = createContext<ProductsContextType | null>(null);

export function useProducts(): ProductsContextType {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider');
  return ctx;
}

export function ProductsProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [query, setQueryState] = useState<ProductListQuery>({ limit: PAGE_SIZE, offset: 0, sort: '-created_at' });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [stale, setStale] = useState<boolean>(true);

  const doFetch = useCallback(async (q: ProductListQuery) => {
    setLoading(true);
    setError(null);
    try {
      const res: ProductListResponse = await listProducts(q);
      setProducts(res.products);
      setTotal(res.total);
      setHasFetched(true);
      setStale(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount or when query changes or when marked stale
  useEffect(() => {
    if (stale || !hasFetched) {
      void doFetch(query);
    }
  }, [query, stale, hasFetched, doFetch]);

  const setQuery = useCallback((update: ProductListQuery | ((prev: ProductListQuery) => ProductListQuery)) => {
    setQueryState((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        setStale(true);
      }
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    await doFetch(query);
  }, [doFetch, query]);

  const invalidate = useCallback(() => {
    setStale(true);
  }, []);

  return (
    <ProductsContext.Provider
      value={{
        products,
        total,
        query,
        loading,
        error,
        hasFetched,
        setQuery,
        refresh,
        invalidate,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}
