import React from "react";
import {
  Search,
  Package,
  Star,
  Download,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { PackageCardSkeleton } from "./PackageCardSkeleton";
import { VirtualizedPackageList } from "./VirtualizedPackageList";
import type { EnhancedBrewPackage } from "../stores/brewStore";

interface SearchResultsProps {
  results: EnhancedBrewPackage[];
  query: string;
  loading: boolean;
  onInstall: (packageName: string) => void;
  onUninstall: (packageName: string) => void;
  onUpdate: (packageName: string) => void;
  onPackageClick?: (pkg: EnhancedBrewPackage) => void;
  viewMode?: "grid" | "list";
  density?: "compact" | "comfortable" | "spacious";
  showAnalytics?: boolean;
  showDescriptions?: boolean;
  className?: string;
  packageType?: "formula" | "cask";
  useVirtualization?: boolean;
  virtualizationThreshold?: number;
}

// Highlight matching text in search results
const HighlightedText: React.FC<{ text: string; query: string }> = ({
  text,
  query,
}) => {
  if (!query.trim()) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-primary/20 text-primary px-1 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

// Calculate relevance score for search results
const calculateRelevance = (
  pkg: EnhancedBrewPackage,
  query: string
): number => {
  if (!query.trim()) return 0;

  const q = query.toLowerCase();
  const name = pkg.name.toLowerCase();
  const description = pkg.description.toLowerCase();

  let score = 0;

  // Exact name match gets highest score
  if (name === q) score += 100;
  // Name starts with query
  else if (name.startsWith(q)) score += 80;
  // Name contains query
  else if (name.includes(q)) score += 60;
  // Description contains query
  else if (description.includes(q)) score += 40;

  // Boost score for popular packages
  if (pkg.enhancedAnalytics?.popularity) {
    score += pkg.enhancedAnalytics.popularity * 20;
  }

  // Boost score for installed packages
  if (pkg.installed) score += 10;

  // Penalize deprecated packages
  if (pkg.warnings?.some((w) => w.type === "deprecated")) score -= 20;

  return score;
};

// Sort results by relevance
const sortByRelevance = (
  results: EnhancedBrewPackage[],
  query: string
): EnhancedBrewPackage[] => {
  return [...results].sort((a, b) => {
    const scoreA = calculateRelevance(a, query);
    const scoreB = calculateRelevance(b, query);
    return scoreB - scoreA;
  });
};

// Format download count for display
const formatDownloads = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

// Get popularity badge variant
const getPopularityVariant = (
  popularity: number
): "default" | "secondary" | "destructive" => {
  if (popularity >= 0.7) return "default";
  if (popularity >= 0.3) return "secondary";
  return "destructive";
};

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  loading,
  onInstall,
  onUninstall,
  onUpdate,
  onPackageClick,
  viewMode = "grid",
  density = "comfortable",
  showAnalytics = true,
  showDescriptions = true,
  className = "",
  packageType = "formula",
  useVirtualization = true,
  virtualizationThreshold = 50,
}) => {
  // Sort results by relevance when we have a query
  const sortedResults = query.trim()
    ? sortByRelevance(results, query)
    : results;

  if (loading) {
    return (
      <div className={`grid grid-cols-1 xl:grid-cols-2 gap-6 ${className}`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <PackageCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (results.length === 0 && query.trim()) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No results found for "{query}"
        </h3>
        <p className="text-muted-foreground mb-4">
          Try adjusting your search terms or check the filters.
        </p>
        <div className="text-sm text-muted-foreground">
          <p>Search tips:</p>
          <ul className="mt-2 space-y-1">
            <li>• Try different keywords</li>
            <li>• Check for typos</li>
            <li>• Use broader terms</li>
            <li>• Clear active filters</li>
          </ul>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Ready to search
        </h3>
        <p className="text-muted-foreground">
          Enter a package name or keyword to find applications and tools.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {query.trim() ? `Search results for "${query}"` : "All packages"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "package" : "packages"}{" "}
            found
            {query.trim() && " • Sorted by relevance"}
          </p>
        </div>
      </div>

      {/* Results Display */}
      {useVirtualization && sortedResults.length > virtualizationThreshold ? (
        <VirtualizedPackageList
          packages={sortedResults}
          loading={loading}
          onInstall={(name) => onInstall(name)}
          onUninstall={(name) => onUninstall(name)}
          onUpdate={(name) => onUpdate(name)}
          onPackageClick={onPackageClick}
          packageType={packageType}
          viewMode={viewMode}
          density={density}
          height={600}
          className="w-full"
        />
      ) : viewMode === "grid" ? (
        <div
          className={`grid gap-6 ${
            density === "compact"
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
              : density === "spacious"
              ? "grid-cols-1 xl:grid-cols-2 gap-8"
              : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          }`}
        >
          {sortedResults.map((pkg) => {
            const relevanceScore = query.trim()
              ? calculateRelevance(pkg, query)
              : 0;

            return (
              <Card
                key={pkg.name}
                className="border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group"
                onClick={() => onPackageClick?.(pkg)}
              >
                <CardContent
                  className={
                    density === "compact"
                      ? "p-4"
                      : density === "spacious"
                      ? "p-8"
                      : "p-6"
                  }
                >
                  <div
                    className={`space-y-${
                      density === "compact"
                        ? "2"
                        : density === "spacious"
                        ? "6"
                        : "4"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4
                            className={`font-semibold text-foreground truncate ${
                              density === "compact" ? "text-base" : "text-lg"
                            }`}
                          >
                            <HighlightedText text={pkg.name} query={query} />
                          </h4>
                          {pkg.installed && (
                            <Badge variant="secondary" className="text-xs">
                              Installed
                            </Badge>
                          )}
                          {pkg.outdated && (
                            <Badge variant="destructive" className="text-xs">
                              Outdated
                            </Badge>
                          )}
                        </div>
                        {showDescriptions && (
                          <p
                            className={`text-muted-foreground line-clamp-2 ${
                              density === "compact" ? "text-xs" : "text-sm"
                            }`}
                          >
                            <HighlightedText
                              text={pkg.description}
                              query={query}
                            />
                          </p>
                        )}
                      </div>

                      {/* Relevance Score (only show if searching) */}
                      {query.trim() && relevanceScore > 0 && (
                        <div className="ml-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {Math.round(relevanceScore)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    {density !== "compact" && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3" />v{pkg.version}
                        </div>

                        {showAnalytics &&
                          pkg.enhancedAnalytics?.downloads365d && (
                            <div className="flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {formatDownloads(
                                pkg.enhancedAnalytics.downloads365d
                              )}
                            </div>
                          )}

                        {pkg.lastUpdated && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(pkg.lastUpdated).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Analytics and Warnings */}
                    {showAnalytics && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {pkg.enhancedAnalytics?.popularity !== undefined && (
                            <Badge
                              variant={getPopularityVariant(
                                pkg.enhancedAnalytics.popularity
                              )}
                              className="text-xs"
                            >
                              {pkg.enhancedAnalytics.popularity >= 0.7
                                ? "Popular"
                                : pkg.enhancedAnalytics.popularity >= 0.3
                                ? "Moderate"
                                : "Low usage"}
                            </Badge>
                          )}

                          {pkg.category && (
                            <Badge variant="outline" className="text-xs">
                              {pkg.category}
                            </Badge>
                          )}
                        </div>

                        {/* Warnings */}
                        {pkg.warnings && pkg.warnings.length > 0 && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs text-yellow-600">
                              {pkg.warnings.length} warning
                              {pkg.warnings.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      {pkg.installed ? (
                        <>
                          {pkg.outdated && (
                            <Button
                              size={density === "compact" ? "sm" : "sm"}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdate(pkg.name);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Update
                            </Button>
                          )}
                          <Button
                            size={density === "compact" ? "sm" : "sm"}
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUninstall(pkg.name);
                            }}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                          >
                            Uninstall
                          </Button>
                        </>
                      ) : (
                        <Button
                          size={density === "compact" ? "sm" : "sm"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onInstall(pkg.name);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Install
                        </Button>
                      )}

                      <Button
                        size={density === "compact" ? "sm" : "sm"}
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPackageClick?.(pkg);
                        }}
                        className="ml-auto"
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // List View
        <div className={`space-y-${density === "compact" ? "2" : "3"}`}>
          {sortedResults.map((pkg) => {
            const relevanceScore = query.trim()
              ? calculateRelevance(pkg, query)
              : 0;

            return (
              <Card
                key={pkg.name}
                className="border-border hover:border-primary/50 transition-all duration-200 cursor-pointer"
                onClick={() => onPackageClick?.(pkg)}
              >
                <CardContent className={density === "compact" ? "p-3" : "p-4"}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`rounded-lg bg-primary/10 flex items-center justify-center text-sm ${
                          density === "compact" ? "w-6 h-6" : "w-8 h-8"
                        }`}
                      >
                        📦
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4
                            className={`font-medium truncate ${
                              density === "compact" ? "text-sm" : "text-base"
                            }`}
                          >
                            <HighlightedText text={pkg.name} query={query} />
                          </h4>
                          {pkg.installed && (
                            <Badge variant="secondary" className="text-xs">
                              Installed
                            </Badge>
                          )}
                          {pkg.outdated && (
                            <Badge variant="destructive" className="text-xs">
                              Outdated
                            </Badge>
                          )}
                          {query.trim() && relevanceScore > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {Math.round(relevanceScore)}
                            </Badge>
                          )}
                        </div>
                        {showDescriptions && (
                          <p
                            className={`text-muted-foreground truncate ${
                              density === "compact" ? "text-xs" : "text-sm"
                            }`}
                          >
                            <HighlightedText
                              text={pkg.description}
                              query={query}
                            />
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {showAnalytics &&
                        pkg.enhancedAnalytics?.popularity !== undefined && (
                          <Badge
                            variant={getPopularityVariant(
                              pkg.enhancedAnalytics.popularity
                            )}
                            className="text-xs"
                          >
                            {Math.round(pkg.enhancedAnalytics.popularity * 100)}
                            %
                          </Badge>
                        )}

                      {pkg.installed ? (
                        <div className="flex gap-1">
                          {pkg.outdated && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdate(pkg.name);
                              }}
                              className={`text-xs ${
                                density === "compact" ? "h-6 px-2" : "h-8 px-3"
                              }`}
                            >
                              Update
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUninstall(pkg.name);
                            }}
                            className={`text-xs ${
                              density === "compact" ? "h-6 px-2" : "h-8 px-3"
                            }`}
                          >
                            Uninstall
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInstall(pkg.name);
                          }}
                          className={`text-xs ${
                            density === "compact" ? "h-6 px-2" : "h-8 px-3"
                          }`}
                        >
                          Install
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
