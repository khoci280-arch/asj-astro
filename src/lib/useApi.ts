/**
 * useApi.ts — SWR-based data fetching hook
 *
 * Wraps apiClient with SWR for automatic:
 * - Caching with TTL
 * - Revalidation on focus
 * - Deduplication of concurrent requests
 * - Loading/error states
 */
import useSWR, { type SWRConfiguration } from 'swr';
import { apiClient } from './apiClient';

/**
 * Fetcher function for SWR — calls apiClient with payload
 */
async function fetcher<T>(action: string, args: unknown[]): Promise<T> {
  const result = await apiClient<T>(action, args, { requireAuth: false });
  return result;
}

/**
 * Hook for fetching data with SWR
 *
 * @param action - Backend action name (e.g., 'getAppData')
 * @param args - Payload array (e.g., ['admin'])
 * @param options - SWR configuration
 * @returns { data, error, isLoading, mutate }
 *
 * @example
 * const { data, isLoading } = useApi('getAppData', ['admin']);
 * // data.success, data.dropdowns, etc.
 */
export function useApi<T = any>(
  action: string | null,
  args: unknown[] = [],
  options?: SWRConfiguration
) {
  const key = action ? [action, ...args] : null;

  return useSWR<T>(
    key,
    ([act, ...rest]) => fetcher<T>(act, rest),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5s dedup
      errorRetryCount: 2,
      ...options,
    }
  );
}

/**
 * Hook for mutations (POST/PUT/DELETE)
 * Returns a mutate function that invalidates related SWR caches
 */
export function useApiMutation() {
  return {
    /**
     * Call a backend action and optionally revalidate specific SWR keys
     */
    async call<T = any>(
      action: string,
      args: unknown[] = [],
      revalidateKeys?: string[]
    ): Promise<T> {
      const result = await apiClient<T>(action, args, { requireAuth: true });
      return result;
    },
  };
}
