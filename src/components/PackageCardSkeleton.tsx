import { Skeleton } from "./ui/skeleton";

export const PackageCardSkeleton = () => (
  <div className="bg-card border border-border rounded-xl p-6">
    <div className="flex items-start gap-4">
      <Skeleton className="w-16 h-16 rounded-2xl flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="h-5 rounded-lg w-32" />
          <Skeleton className="w-20 h-7 rounded-lg" />
        </div>
        <div className="mb-3">
          <Skeleton className="h-3.5 rounded-lg mb-1.5 w-full" />
          <Skeleton className="h-3.5 rounded-lg w-3/4" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);
