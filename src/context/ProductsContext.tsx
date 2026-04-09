'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
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
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const lastFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    const cacheKey = `${fetchTrigger}-${JSON.stringify(query)}`;

    if (lastFetchedRef.current === cacheKey) {
      return;
    }

    let cancelled = false;
    lastFetchedRef.current = cacheKey;

    async function doFetch(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const res: ProductListResponse = await listProducts(query);
        if (cancelled) return;
        setProducts(res.products);
        setTotal(res.total);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void doFetch();
    return () => { cancelled = true; };
  }, [fetchTrigger, query]);

  const setQuery = useCallback((update: ProductListQuery | ((prev: ProductListQuery) => ProductListQuery)) => {
    setQueryState(update);
  }, []);

  const refresh = useCallback(() => {
    setFetchTrigger((n) => n + 1);
    return Promise.resolve();
  }, []);

  const invalidate = useCallback(() => {
    lastFetchedRef.current = null;
    setFetchTrigger((n) => n + 1);
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
