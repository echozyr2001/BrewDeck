import React from "react";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { RefreshCw, AlertTriangle, Package, Search, Grid } from "lucide-react";

// Progressive loading component for large lists
export const ProgressiveLoader = ({
  isLoading,
  hasMore,
  onLoadMore,
  children,
}: {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  children: React.ReactNode;
}) => (
  <div className="space-y-6">
    {children}

    {hasMore && (
      <div className="text-center py-8">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-muted-foreground">
              Loading more packages...
            </span>
          </div>
        ) : (
          <Button onClick={onLoadMore} variant="outline" className="px-8">
            Load More Packages
          </Button>
        )}
      </div>
    )}
  </div>
);

// Inline loading indicator for operations
export const InlineLoader = ({
  message = "Loading...",
  size = "sm",
}: {
  message?: string;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <RefreshCw className={`${sizeClasses[size]} animate-spin`} />
      <span className="text-sm">{message}</span>
    </div>
  );
};

// Full page loading state
export const FullPageLoader = ({
  title = "Loading",
  message = "Please wait while we load your content...",
}: {
  title?: string;
  message?: string;
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] py-16">
    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground text-center max-w-md">{message}</p>
  </div>
);

// Search loading state
export const SearchLoader = ({ query }: { query: string }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
        <Search className="w-4 h-4 text-primary animate-pulse" />
      </div>
      <div>
        <h3 className="font-medium">Searching for "{query}"</h3>
        <p className="text-sm text-muted-foreground">
          Finding the best matches...
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="bg-card border border-border rounded-xl p-6 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Tab loading state
export const TabLoader = ({
  activeTab,
  tabs,
}: {
  activeTab: string;
  tabs: Array<{ id: string; label: string }>;
}) => (
  <div className="space-y-6">
    {/* Tab bar skeleton */}
    <div className="bg-muted/30 p-1 rounded-xl border border-border/50">
      <div className="flex relative">
        {tabs.map((tab, _) => (
          <div
            key={tab.id}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg ${
              tab.id === activeTab
                ? "bg-background border border-border/50"
                : ""
            }`}
          >
            <Skeleton className="w-6 h-6 rounded-md" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>

    {/* Content skeleton */}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="bg-card border border-border rounded-xl p-6 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Operation progress indicator
export const OperationProgress = ({
  operation,
  progress,
}: {
  operation: string;
  progress?: number;
}) => (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
    <div className="flex items-center gap-3 mb-3">
      <RefreshCw className="w-5 h-5 text-primary animate-spin" />
      <div>
        <p className="font-medium text-primary">{operation}</p>
        <p className="text-sm text-muted-foreground">
          This may take a few moments...
        </p>
      </div>
    </div>

    {progress !== undefined && (
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    )}
  </div>
);

// Batch operation loader
export const BatchOperationLoader = ({
  operations,
}: {
  operations: Array<{
    name: string;
    status: "pending" | "running" | "completed" | "failed";
  }>;
}) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-4">
      <RefreshCw className="w-5 h-5 animate-spin text-primary" />
      <h3 className="font-medium">Processing batch operations...</h3>
    </div>

    <div className="space-y-2">
      {operations.map((op, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 bg-card border rounded-lg"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              op.status === "completed"
                ? "bg-green-500"
                : op.status === "failed"
                ? "bg-red-500"
                : op.status === "running"
                ? "bg-blue-500 animate-pulse"
                : "bg-gray-300"
            }`}
          />
          <span className="flex-1 text-sm">{op.name}</span>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              op.status === "completed"
                ? "bg-green-100 text-green-800"
                : op.status === "failed"
                ? "bg-red-100 text-red-800"
                : op.status === "running"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {op.status}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Network error state
export const NetworkErrorState = ({
  onRetry,
  message = "Unable to connect to Homebrew services",
}: {
  onRetry: () => void;
  message?: string;
}) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <AlertTriangle className="w-8 h-8 text-red-600" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">
      Connection Error
    </h3>
    <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>
    <div className="flex gap-3 justify-center">
      <Button onClick={onRetry} className="bg-primary text-primary-foreground">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
      <Button variant="outline">Check Network Settings</Button>
    </div>
  </div>
);

// Empty package list state
export const EmptyPackageState = ({
  type,
  onBrowse,
}: {
  type: "installed" | "search" | "category";
  onBrowse?: () => void;
}) => {
  const content = {
    installed: {
      icon: <Package className="w-8 h-8" />,
      title: "No packages installed",
      message:
        "You haven't installed any packages yet. Browse our catalog to get started.",
      action: "Browse Packages",
    },
    search: {
      icon: <Search className="w-8 h-8" />,
      title: "No results found",
      message: "Try adjusting your search terms or browse categories instead.",
      action: "Browse Categories",
    },
    category: {
      icon: <Grid className="w-8 h-8" />,
      title: "No packages in this category",
      message: "This category doesn't have any packages available right now.",
      action: "Browse All Categories",
    },
  };

  const { icon, title, message, action } = content[type];

  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>
      {onBrowse && (
        <Button onClick={onBrowse} variant="outline">
          {action}
        </Button>
      )}
    </div>
  );
};
