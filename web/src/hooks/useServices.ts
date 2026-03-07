import { useCallback } from 'react';
import useSWR from 'swr';
import { fetchApi } from '@/lib/api-client';
import type { Service } from '@/types/api';

export interface UseServicesOptions {
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

export interface UseServicesResult {
  services: Service[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useServices(options: UseServicesOptions = {}): UseServicesResult {
  const { refreshInterval = 10000, onError } = options;

  const { data, error, isLoading, mutate: swrMutate } = useSWR<{ services: Service[] }>(
    '/api/dashboard',
    fetchApi,
    { refreshInterval }
  );

  const mutate = useCallback(async () => {
    await swrMutate();
  }, [swrMutate]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await fetchApi(`/api/services/${id}`, { method: 'DELETE' });
        await swrMutate();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (onError) onError(error);
        throw error;
      }
    },
    [onError, swrMutate]
  );

  return {
    services: data?.services || [],
    isLoading,
    error,
    mutate,
    remove,
  };
}
