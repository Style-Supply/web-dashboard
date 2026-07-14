/**
 * SWR configuration for the admin dashboard.
 *
 * Usage:
 *   import { useDashboard } from '@/lib/swr';
 *   const { data, isLoading, error, mutate } = useDashboard<MyType>('/api/admin/products');
 *
 * - Responses are cached for the browser session
 * - Navigation between pages reuses cached data (instant)
 * - Background revalidation keeps data fresh every 30s
 * - Manual refresh: call mutate() or mutate('/api/admin/products')
 */

import useSWR, { SWRConfig, mutate as globalMutate } from 'swr';
import { request } from '@/lib/api';

// ─── SWR global config ───────────────────────────────────────────────────────

/**
 * Wrap your dashboard layout (or individual pages) with this provider
 * to share SWR configuration globally.
 *
 * Already included in src/app/layout.tsx if you added it there.
 */
export { SWRConfig };

export const swrConfig = {
  fetcher: (url: string) => request(url),
  revalidateOnFocus: false,      // don't re-fetch when tab gets focus
  revalidateOnReconnect: true,   // re-fetch on network reconnect
  refreshInterval: 30_000,       // background refresh every 30s
  dedupingInterval: 5_000,       // deduplicate calls within 5s window
  errorRetryCount: 2,            // retry on error max 2 times
  keepPreviousData: true,        // show stale data while fetching fresh
};

// ─── Typed hook ──────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for manual fetch-on-mount pattern.
 *
 * Before:
 *   const [data, setData] = useState([]);
 *   const [loading, setLoading] = useState(true);
 *   useEffect(() => { request('/api/admin/products').then(setData).finally(...) }, []);
 *
 * After:
 *   const { data, isLoading, error, mutate } = useDashboard<ProductListResponse>('/api/admin/products');
 */
export function useDashboard<T>(
  key: string | null,
  options?: { refreshInterval?: number; revalidateOnMount?: boolean }
) {
  return useSWR<T, Error>(key, {
    ...options,
  });
}

/**
 * Invalidate (force re-fetch) a cached key after a mutation.
 *
 * Example: after approving a review, invalidate the reviews list:
 *   await request('/api/admin/reviews/123/approve', { method: 'POST' });
 *   invalidate('/api/admin/reviews');
 */
export function invalidate(key: string) {
  return globalMutate(key);
}
