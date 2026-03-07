import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Dashboard loading skeleton
 * Shows skeleton for time widget, status pills, and service cards
 */
export function DashboardLoadingSkeleton() {
    return (
        <div className="flex flex-col items-center w-full max-w-[1400px] mx-auto px-2 sm:px-6 lg:px-12 pb-10">
            {/* Time Widget Skeleton */}
            <div className="flex flex-col items-center justify-center w-full py-8 lg:py-12">
                <Skeleton className="h-20 w-48 sm:h-24 sm:w-64 lg:h-32 lg:w-80 rounded-lg mb-4" />
                <Skeleton className="h-6 w-64 rounded-full" />
            </div>

            {/* Status Pills Skeleton */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-5 mb-14 w-full">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-32 sm:w-40 rounded-full" />
                ))}
            </div>

            {/* Service Cards Grid Skeleton */}
            <div className="flex flex-wrap justify-center content-start gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10 w-full max-w-[900px] mx-auto px-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-full max-w-[120px] flex flex-col items-center gap-3.5">
                        <Skeleton className="w-[4.5rem] h-[4.5rem] sm:w-[5.5rem] sm:h-[5.5rem] lg:w-[6.5rem] lg:h-[6.5rem] rounded-[1.25rem] lg:rounded-[1.75rem]" />
                        <Skeleton className="h-4 w-20 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Table loading skeleton
 * Shows realistic table skeleton with staggered animations
 */
export function TableLoadingSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
    // Define column width distribution for realistic look
    const getColumnWidth = (colIdx: number) => {
        const widths = ["w-24", "w-32", "w-40", "w-20", "w-28", "w-16"];
        return widths[colIdx % widths.length];
    };

    return (
        <div className="w-full space-y-0">
            {/* Table Header */}
            <div className="flex items-center h-12 px-4 border-b border-border/30 bg-secondary/20">
                {[...Array(columns)].map((_, i) => (
                    <div key={`header-${i}`} className="flex-1 min-w-0">
                        <Skeleton className={cn("h-4 rounded", getColumnWidth(i))} />
                    </div>
                ))}
            </div>

            {/* Table Body Rows */}
            {[...Array(rows)].map((_, rowIdx) => (
                <div 
                    key={`row-${rowIdx}`} 
                    className="flex items-center h-16 px-4 border-b border-border/10 hover:bg-secondary/5 transition-colors"
                    style={{
                        animation: `fadeIn 0.5s ease-out ${rowIdx * 50}ms both`,
                    }}
                >
                    {[...Array(columns)].map((_, colIdx) => {
                        // Vary skeleton heights slightly for more natural look
                        const heights = ["h-3", "h-3", "h-4", "h-3", "h-3", "h-3"];
                        const heightClass = heights[colIdx % heights.length];
                        
                        return (
                            <div key={`cell-${rowIdx}-${colIdx}`} className="flex-1 min-w-0 pr-2">
                                <Skeleton className={cn(
                                    "rounded-sm bg-primary/8",
                                    heightClass,
                                    getColumnWidth(colIdx)
                                )} />
                            </div>
                        );
                    })}
                </div>
            ))}

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-2px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Card grid loading skeleton
 * Shows skeleton for card-based layouts (integrations, etc)
 */
export function CardGridLoadingSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(count)].map((_, i) => (
                <div 
                    key={i} 
                    className="space-y-4 p-4 rounded-lg border border-border/20 bg-secondary/30"
                    style={{
                        animation: `fadeIn 0.5s ease-out ${i * 50}ms both`,
                    }}
                >
                    <div className="flex justify-between items-start gap-3">
                        <Skeleton className="h-5 w-32 rounded" />
                        <Skeleton className="h-6 w-16 rounded-full flex-shrink-0" />
                    </div>
                    <Skeleton className="h-3 w-28 rounded" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-full rounded" />
                        <Skeleton className="h-3 w-3/4 rounded" />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                    </div>
                </div>
            ))}

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-4px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Page header loading skeleton
 */
export function PageHeaderLoadingSkeleton() {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
                <Skeleton className="h-8 w-48 rounded mb-2" />
                <Skeleton className="h-4 w-96 rounded" />
            </div>
            <div className="flex gap-2 flex-shrink-0">
                <Skeleton className="h-10 w-32 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>
        </div>
    );
}

/**
 * Detailed page loading skeleton
 */
export function DetailPageLoadingSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Skeleton className="h-8 w-64 rounded mb-2" />
                <Skeleton className="h-4 w-96 rounded" />
            </div>

            {/* Info Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24 rounded" />
                        <Skeleton className="h-8 w-full rounded" />
                    </div>
                ))}
            </div>

            {/* Content Section */}
            <div className="space-y-3">
                <Skeleton className="h-6 w-32 rounded" />
                <Skeleton className="h-32 w-full rounded" />
            </div>
        </div>
    );
}

/**
 * List item skeleton
 */
export function ListItemLoadingSkeleton() {
    return (
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
            </div>
            <Skeleton className="h-8 w-20 rounded" />
        </div>
    );
}

/**
 * Shimmer animation wrapper for enhanced visual effect
 */
export function ShimmerSkeleton({ 
    className = "",
    ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 bg-[length:200%_100%] animate-shimmer",
                className
            )}
            {...props}
        />
    );
}
