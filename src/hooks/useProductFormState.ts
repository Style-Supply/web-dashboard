'use client';

import { useCallback, useState } from 'react';
import type { ProductPayload, ProductVariant } from '@/types/product';

function emptyVariant(): ProductVariant {
  return { size: 'M', colour_id: null, custom_colour: null, quantity: 0, location_id: null };
}

function defaultState(): ProductPayload {
  return {
    name: '',
    sku: null,
    brand_id: null,
    category_id: null,
    subcategory_id: null,
    sub_subcategory_id: null,
    material_id: null,
    fabric_details: null,
    description: null,
    retail_price_minor: 0,
    rent_price_minor: null,
    currency: 'INR',
    status: 'draft',
    variants: [emptyVariant()],
    look_ids: [],
  };
}

export interface UseProductFormState {
  state: ProductPayload;
  set: (next: ProductPayload) => void;
  setField: <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) => void;
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

  return { state, set, setField };
}
