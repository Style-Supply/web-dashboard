'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
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
  const hasFetched = useRef<string | null>(null);

  const fetchProducts = useCallback(async (q: ProductListQuery, force = false): Promise<void> => {
    const queryKey = JSON.stringify(q);

    // Skip if already fetched this exact query (unless forced)
    if (!force && hasFetched.current === queryKey) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res: ProductListResponse = await listProducts(q);
      setProducts(res.products);
      setTotal(res.total);
      hasFetched.current = queryKey;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const setQuery = useCallback((update: ProductListQuery | ((prev: ProductListQuery) => ProductListQuery)) => {
    setQueryState((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      void fetchProducts(next);
      return next;
    });
  }, [fetchProducts]);

  const refresh = useCallback(async () => {
    await fetchProducts(query, true);
  }, [fetchProducts, query]);

  const invalidate = useCallback(() => {
    hasFetched.current = null;
  }, []);

  // Initial fetch when query changes and hasn't been fetched
  const queryKey = JSON.stringify(query);
  if (hasFetched.current !== queryKey && !loading) {
    void fetchProducts(query);
  }

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
