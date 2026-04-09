'use client';

import { useCallback, useState } from 'react';
import type { ProductPayload, ProductVariant } from '@/types/product';

function emptyVariant(): ProductVariant {
  return { size: '', colour: null, quantity: 0, location: null };
}

function defaultState(): ProductPayload {
  return {
    name: '',
    brand: null,
    retail_price_minor: 0,
    rent_price_minor: null,
    currency: 'INR',
    category: null,
    collection: null,
    fabric: null,
    description: null,
    status: 'draft',
    variants: [emptyVariant()],
  };
}

export interface UseProductFormState {
  state: ProductPayload;
  set: (next: ProductPayload) => void;
  setField: <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) => void;
  addVariant: () => void;
  removeVariant: (index: number) => void;
  updateVariant: (index: number, patch: Partial<ProductVariant>) => void;
}

export function useProductFormState(initial?: Partial<ProductPayload>): UseProductFormState {
  const [state, setState] = useState<ProductPayload>(() => ({ ...defaultState(), ...initial }));

  const set = useCallback((next: ProductPayload): void => {
    setState(next);
  }, []);

  const setField = useCallback(
    <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]): void => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const addVariant = useCallback((): void => {
    setState((prev) => ({ ...prev, variants: [...prev.variants, emptyVariant()] }));
  }, []);

  const removeVariant = useCallback((index: number): void => {
    setState((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  }, []);

  const updateVariant = useCallback((index: number, patch: Partial<ProductVariant>): void => {
    setState((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  }, []);

  return { state, set, setField, addVariant, removeVariant, updateVariant };
}
