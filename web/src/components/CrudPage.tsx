import type { LucideIcon } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataFetcher } from "@/components/DataFetcher";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableLoadingSkeleton } from "@/components/LoadingSkeletons";
import { SearchInput } from "@/components/SearchInput";
import { PageHeader } from "@/components/PageHeader";
import { AppLayout } from "@/layouts/AppLayout";
import { Plus } from "lucide-react";

export interface CrudPageProps<T> {
  /** Page title shown in the header */
  title: string;
  /** Page description shown below the title */
  description: string;
  /** Icon shown in the empty-state illustration */
  emptyIcon: LucideIcon;
  /** Label for the "empty" state */
  emptyTitle: string;
  /** Description for the "empty" state */
  emptyDescription: string;
  /** Label on the primary action button */
  addLabel: string;

  // Data
  data: T[] | undefined;
  filteredData: T[];
  isLoading: boolean;
  error: Error | undefined;
  onRetry: () => void;

  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // Add action
  onAdd: () => void;

  /** Number of table skeleton columns shown while loading */
  skeletonColumns?: number;

  /** Optional custom loading component */
  loadingComponent?: React.ReactNode;

  /**
   * If true, the children won't be wrapped in a Card container.
   * Useful for grid layouts where items are cards themselves.
   */
  noContainer?: boolean;

  /**
   * Renders the table body content. Receives the filtered data so you can
   * map over it and return <TableRow> elements.
   */
  children: (data: T[]) => React.ReactNode;

  /**
   * Optional extra elements rendered inside PageHeader (e.g. additional buttons)
   */
  headerActions?: React.ReactNode;
}

/**
 * Generic CRUD list page.
 *
 * Encapsulates the repetitive layout shared by Services, Networks, Users, etc.:
 *  - AppLayout wrapper
 *  - PageHeader with search + add button
 *  - DataFetcher (loading / error / empty / data states)
 *  - Card table container (optional)
 *
 * The caller only needs to provide the content via the `children` render prop.
 */
export function CrudPage<T>({
  title,
  description,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  addLabel,
  data,
  filteredData,
  isLoading,
  error,
  onRetry,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  onAdd,
  skeletonColumns = 5,
  loadingComponent,
  noContainer = false,
  children,
  headerActions,
}: CrudPageProps<T>) {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader title={title} description={description}>
          <SearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="w-full md:w-64"
          />
          {headerActions}
          <Button
            onClick={onAdd}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        </PageHeader>

        <DataFetcher
          data={data}
          isLoading={isLoading}
          error={error}
          onRetry={onRetry}
          loadingComponent={
            loadingComponent || (
              <Card>
                <CardContent className="p-6">
                  <TableLoadingSkeleton rows={5} columns={skeletonColumns} />
                </CardContent>
              </Card>
            )
          }
          errorComponent={(err, retry) => (
            <ErrorState message={err.message} onRetry={retry} />
          )}
          emptyComponent={() => (
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
            />
          )}
        >
          {() =>
            noContainer ? (
              children(filteredData)
            ) : (
              <Card>
                <CardContent className="p-0">
                  {children(filteredData)}
                </CardContent>
              </Card>
            )
          }
        </DataFetcher>
      </div>
    </AppLayout>
  );
}
