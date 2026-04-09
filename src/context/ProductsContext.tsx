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
  const [fetchKey, setFetchKey] = useState(0);
  const [lastFetchedKey, setLastFetchedKey] = useState<string | null>(null);

  const currentKey = `${fetchKey}-${JSON.stringify(query)}`;

  useEffect(() => {
    if (lastFetchedKey === currentKey) return;

    let cancelled = false;

    async function doFetch(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const res: ProductListResponse = await listProducts(query);
        if (cancelled) return;
        setProducts(res.products);
        setTotal(res.total);
        setLastFetchedKey(currentKey);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void doFetch();
    return () => { cancelled = true; };
  }, [currentKey, query, lastFetchedKey]);

  const setQuery = useCallback((update: ProductListQuery | ((prev: ProductListQuery) => ProductListQuery)) => {
    setQueryState(update);
  }, []);

  const refresh = useCallback(() => {
    setFetchKey((k) => k + 1);
    return Promise.resolve();
  }, []);

  const invalidate = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return (
    <ProductsContext.Provider
      value={{
        products,
        total,
        query,
        loading,
        error,
        setQuery,
        refresh,
        invalidate,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}
