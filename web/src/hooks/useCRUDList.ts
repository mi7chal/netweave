import { useCallback } from 'react';
import useSWR from 'swr';
import { fetchApi } from '@/lib/api-client';

export interface UseCRUDListOptions {
  endpoint: string;
  onError?: (error: Error) => void;
  revalidateOnFocus?: boolean;
}

export interface UseCRUDListResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
  add: (item: T) => Promise<void>;
  remove: (id: string) => Promise<void>;
  update: (id: string, item: T) => Promise<void>;
}

/**
 * Reusable hook for CRUD list operations with SWR data fetching
 * Handles loading, error states, and mutations
 */
export function useCRUDList<T extends { id?: string }>(
  options: UseCRUDListOptions
): UseCRUDListResult<T> {
  const { endpoint, onError, revalidateOnFocus = false } = options;

  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    endpoint,
    (url: string) => fetchApi<T[]>(url),
    {
      revalidateOnFocus,
      dedupingInterval: 60000,
    }
  );

  const handleError = useCallback(
    (err: Error) => {
      if (onError) onError(err);
      console.error(`Error in ${endpoint}:`, err);
    },
    [endpoint, onError]
  );

  const mrefresh = useCallback(async () => {
    try {
      await swrMutate();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [swrMutate, handleError]);

  const add = useCallback(
    async (item: T) => {
      try {
        await fetchApi(endpoint, {
          method: 'POST',
          body: JSON.stringify(item),
        });
        await swrMutate();
      } catch (err) {
        handleError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [endpoint, swrMutate, handleError]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await fetchApi(`${endpoint}/${id}`, { method: 'DELETE' });
        await swrMutate();
      } catch (err) {
        handleError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [endpoint, swrMutate, handleError]
  );

  const update = useCallback(
    async (id: string, item: T) => {
      try {
        await fetchApi(`${endpoint}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(item),
        });
        await swrMutate();
      } catch (err) {
        handleError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [endpoint, swrMutate, handleError]
  );

  return {
    data: data || [],
    isLoading,
    error,
    mutate: mrefresh,
    add,
    remove,
    update,
  };
}
