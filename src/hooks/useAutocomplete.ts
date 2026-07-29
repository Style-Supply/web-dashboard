'use client';

import { useEffect, useState } from 'react';
import type { SuggestionField } from '@/types/product';
import { getSuggestions } from '@/lib/api';

export interface UseAutocompleteResult {
  suggestions: string[];
  loading: boolean;
}

export function useAutocomplete(field: SuggestionField, query: string): UseAutocompleteResult {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const empty = !query || query.trim().length === 0;
  const effectiveSuggestions = empty ? [] : suggestions;
  const effectiveLoading = empty ? false : loading;

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      getSuggestions(field, query, controller.signal)
        .then((results) => {
          if (!cancelled) {
            setSuggestions(results.slice(0, 10));
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setLoading(false);
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [field, query]);

  return { suggestions: effectiveSuggestions, loading: effectiveLoading };
}
