import React from 'react';

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
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )
    );
  }

  if (error) {
    return (
      errorComponent?.(error, onRetry) || (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">Error loading data</p>
          <p className="text-xs text-destructive/80">{error.message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-destructive hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      )
    );
  }

  if (!data || data.length === 0) {
    return (
      emptyComponent?.(emptyMessage) || (
        <div className="flex items-center justify-center p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )
    );
  }

  return <>{children(data)}</>;
}
