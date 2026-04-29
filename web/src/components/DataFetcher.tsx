import React from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface DataFetcherProps<T> {
  isLoading: boolean;
  error?: Error;
  data?: T[] | null;
  onRetry?: () => void;
  emptyMessage?: string;
  children: (data: T[]) => React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: (error: Error, onRetry?: () => void) => React.ReactNode;
  emptyComponent?: (message: string) => React.ReactNode;
}

/**
 * Reusable component for handling data fetch states
 * Manages loading, error, and empty state UI automatically
 */
export function DataFetcher<T>({
  isLoading,
  error,
  data,
  onRetry,
  emptyMessage = 'No data available',
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
}: DataFetcherProps<T>) {
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="py-10 text-center">Loading...</div>
      )
    );
  }

  if (error) {
    return (
      errorComponent?.(error, onRetry) || (
        <Alert>
          <AlertTitle>Error loading data</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
          {onRetry && (
            <Button onClick={onRetry} size="sm" variant="secondary" className="mt-3">
              Retry
            </Button>
          )}
        </Alert>
      )
    );
  }

  if (!data || data.length === 0) {
    return (
      emptyComponent?.(emptyMessage) || (
        <div className="py-10 text-center">{emptyMessage}</div>
      )
    );
  }

  return <>{children(data)}</>;
}
