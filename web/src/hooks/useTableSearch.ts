/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useDebounce } from './useDebounce';

export interface UseTableSearchOptions<T> {
  searchableFields: (keyof T)[];
  debounceMs?: number;
}

export interface UseTableSearchResult<T> {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredData: T[];
}

/**
 * Reusable hook for filtering table data by search term
 * Supports searching across multiple fields with debouncing
 */
export function useTableSearch<T extends Record<string, any>>(
  data: T[],
  options: UseTableSearchOptions<T>
): UseTableSearchResult<T> {
  const { searchableFields, debounceMs = 300 } = options;
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm) return data;

    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return data.filter((item) =>
      searchableFields.some((field) => {
        const value = item[field];
        return value?.toString().toLowerCase().includes(lowerSearch);
      })
    );
  }, [data, debouncedSearchTerm, searchableFields]);

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
  };
}
