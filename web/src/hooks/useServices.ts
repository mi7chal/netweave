import { useCallback } from 'react';
import useSWR from 'swr';
import type { Service } from '@/types/api';
import { deleteService, getDashboardServices } from '@/lib/api/services';

export interface UseServicesOptions {
  refreshInterval?: number;
  onLoadError?: (error: Error) => void;
  onMutationError?: (error: Error) => void;
}

export interface UseServicesResult {
  services: Service[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useServices(options: UseServicesOptions = {}): UseServicesResult {
  const { refreshInterval = 10000, onLoadError, onMutationError } = options;

  const { data, error, isLoading, mutate: swrMutate } = useSWR<{ services: Service[] }>(
    ['dashboard-services'],
    getDashboardServices,
    {
      refreshInterval,
      onError: (err) => {
        const normalized = err instanceof Error ? err : new Error(String(err));
        if (onLoadError) onLoadError(normalized);
      },
    }
  );

  const mutate = useCallback(async () => {
    await swrMutate();
  }, [swrMutate]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteService(id);
        await swrMutate();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (onMutationError) onMutationError(error);
        throw error;
      }
    },
    [onMutationError, swrMutate]
  );

  return {
    services: data?.services ?? [],
    isLoading,
    error,
    mutate,
    remove,
  };
}
