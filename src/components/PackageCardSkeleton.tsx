import { Skeleton } from "./ui/skeleton";

interface PackageCardSkeletonProps {
  showEnhancedMetadata?: boolean;
}

export const PackageCardSkeleton = ({
  showEnhancedMetadata = true,
}: PackageCardSkeletonProps) => (
  <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="relative flex-shrink-0">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        {/* Simulate status indicators */}
        <div className="absolute -top-1 -right-1">
          <Skeleton className="w-5 h-5 rounded-full" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Skeleton className="h-6 rounded-lg w-40" />
            {/* Simulate warning badges */}
            <Skeleton className="h-5 w-6 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Skeleton className="w-20 h-8 rounded-lg" />
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <Skeleton className="h-4 rounded-lg mb-2 w-full" />
          <Skeleton className="h-4 rounded-lg w-3/4" />
        </div>

        {showEnhancedMetadata && (
          <div className="space-y-3">
            {/* Primary badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>

            {/* Analytics and metadata */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-18 rounded" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>

            {/* Caveats area */}
            <Skeleton className="h-12 w-full rounded border" />
          </div>
        )}
      </div>
    </div>
  </div>
);

// Skeleton for package lists
export const PackageListSkeleton = ({
  count = 6,
  showEnhancedMetadata = true,
}: {
  count?: number;
  showEnhancedMetadata?: boolean;
}) => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <PackageCardSkeleton
        key={index}
        showEnhancedMetadata={showEnhancedMetadata}
      />
    ))}
  </div>
);

// Skeleton for search results
export const SearchResultsSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-32" />
    </div>
    <PackageListSkeleton count={4} />
  </div>
);

// Skeleton for category grid
export const CategoryGridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    {Array.from({ length: 9 }).map((_, index) => (
      <div
        key={index}
        className="bg-card border border-border rounded-xl p-6 animate-pulse"
      >
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    ))}
  </div>
);

// Loading state with shimmer effect
export const ShimmerSkeleton = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer ${className}`}
  />
);

// Error state component
export const ErrorState = ({
  title = "Something went wrong",
  message = "We encountered an error while loading this content.",
  onRetry,
  showRetry = true,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg
        className="w-8 h-8 text-red-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>
    {showRetry && onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Try Again
      </button>
    )}
  </div>
);

// Empty state component
export const EmptyState = ({
  title = "No items found",
  message = "There are no items to display at the moment.",
  icon,
  action,
}: {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
      {icon || (
        <svg
          className="w-8 h-8 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      )}
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>
    {action}
  </div>
);
