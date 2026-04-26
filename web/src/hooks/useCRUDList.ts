import { useCallback } from 'react';
import useSWR from 'swr';
import { fetchApi } from '@/lib/api-client';

export interface UseCRUDListOptions {
  endpoint: string;
  onLoadError?: (error: Error) => void;
  onMutationError?: (error: Error) => void;
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
  const {
    endpoint,
    onLoadError,
    onMutationError,
    revalidateOnFocus = false,
  } = options;

  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    endpoint,
    (url: string) => fetchApi<T[]>(url),
    {
      revalidateOnFocus,
      dedupingInterval: 60000,
      onError: (err) => {
        const normalized = err instanceof Error ? err : new Error(String(err));
        if (onLoadError) onLoadError(normalized);
        console.error(`Load error in ${endpoint}:`, normalized);
      },
    }
  );

  const handleError = useCallback(
    (err: Error) => {
      if (onMutationError) onMutationError(err);
      console.error(`Mutation error in ${endpoint}:`, err);
    },
    [endpoint, onMutationError]
  );

  const mrefresh = useCallback(async () => {
    try {
      await swrMutate();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (onLoadError) onLoadError(error);
      console.error(`Refresh error in ${endpoint}:`, error);
    }
  }, [swrMutate, onLoadError, endpoint]);

  const add = useCallback(
    async (item: T) => {
      try {
        await fetchApi(endpoint, {
          method: 'POST',
          silent: true,
          body: JSON.stringify(item),
        });
        await swrMutate();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        handleError(error);
        throw error;
      }
    },
    [endpoint, swrMutate, handleError]
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await fetchApi(`${endpoint}/${id}`, { method: 'DELETE', silent: true });
        // Explicit revalidation to keep list UI and count badges in sync.
        await swrMutate();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        handleError(error);
        throw error;
      }
    },
    [endpoint, swrMutate, handleError]
  );

  const update = useCallback(
    async (id: string, item: T) => {
      try {
        await fetchApi(`${endpoint}/${id}`, {
          method: 'PUT',
          silent: true,
          body: JSON.stringify(item),
        });
        await swrMutate();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        handleError(error);
        throw error;
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
