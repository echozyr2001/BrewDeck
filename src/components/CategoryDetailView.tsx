import React, { useState, useMemo } from "react";
import { ArrowLeft, Package, Star, Download, Clock, Filter, Grid, List, Search } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { getCategoryIcon } from "../utils/categoryUtils";
import { useBrewStore } from "../stores/brewStore";
import type { Category } from "../data/categories";
import type { EnhancedBrewPackage } from "../stores/brewStore";

interface CategoryDetailViewProps {
  category: Category;
  onBack: () => void;
  onPackageSelect: (pkg: EnhancedBrewPackage) => void;
  onInstall: (packageName: string) => void;
  onUninstall: (packageName: string) => void;
  onUpdate: (packageName: string) => void;
  className?: string;
}

type SortOption = "name" | "popularity" | "updated" | "size";
type FilterOption = "all" | "installed" | "not-installed" | "outdated";
type ViewMode = "grid" | "list";

// Format download count for display
const formatDownloads = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

// Get popularity badge variant
const getPopularityVariant = (popularity: number): "default" | "secondary" | "outline" => {
  if (popularity >= 0.7) return "default";
  if (popularity >= 0.3) return "secondary";
  return "outline";
};

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  category,
  onBack,
  onPackageSelect,
  onInstall,
  onUninstall,
  onUpdate,
  className = "",
}) => {
  const { getPackagesByType } = useBrewStore();
  
  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popularity");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Get all cask packages and filter by category
  const allCasks = getPackagesByType("cask");
  const categoryPackages = useMemo(() => {
    return allCasks.filter(pkg => category.casks.includes(pkg.name));
  }, [allCasks, category.casks]);

  // Filter packages based on search and filters
  const filteredPackages = useMemo(() => {
    let filtered = categoryPackages;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pkg =>
        pkg.name.toLowerCase().includes(query) ||
        pkg.description.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    switch (filterBy) {
      case "installed":
        filtered = filtered.filter(pkg => pkg.installed);
        break;
      case "not-installed":
        filtered = filtered.filter(pkg => !pkg.installed);
        break;
      case "outdated":
        filtered = filtered.filter(pkg => pkg.outdated);
        break;
    }

    return filtered;
  }, [categoryPackages, searchQuery, filterBy]);

  // Sort packages
  const sortedPackages = useMemo(() => {
    return [...filteredPackages].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "popularity":
          const aPopularity = a.enhancedAnalytics?.popularity || 0;
          const bPopularity = b.enhancedAnalytics?.popularity || 0;
          return bPopularity - aPopularity;

        case "updated":
          const aUpdated = a.lastUpdated?.getTime() || 0;
          const bUpdated = b.lastUpdated?.getTime() || 0;
          return bUpdated - aUpdated;
        case "size":
          const aSize = a.installSize || 0;
          const bSize = b.installSize || 0;
          return bSize - aSize;
        default:
          return 0;
      }
    });
  }, [filteredPackages, sortBy]);

  // Calculate category stats
  const stats = useMemo(() => {
    const total = categoryPackages.length;
    const installed = categoryPackages.filter(pkg => pkg.installed).length;
    const outdated = categoryPackages.filter(pkg => pkg.outdated).length;
    const popular = categoryPackages.filter(pkg => 
      pkg.enhancedAnalytics?.popularity && pkg.enhancedAnalytics.popularity > 0.7
    ).length;

    return { total, installed, outdated, popular };
  }, [categoryPackages]);

  // Render package card
  const renderPackageCard = (pkg: EnhancedBrewPackage) => (
    <Card
      key={pkg.name}
      className="border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group"
      onClick={() => onPackageSelect(pkg)}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {pkg.name}
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
              <p className="text-sm text-muted-foreground line-clamp-2">
                {pkg.description}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              v{pkg.version}
            </div>
            
            {pkg.enhancedAnalytics?.downloads365d && (
              <div className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {formatDownloads(pkg.enhancedAnalytics.downloads365d)}
              </div>
            )}
            
            {pkg.lastUpdated && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(pkg.lastUpdated).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pkg.enhancedAnalytics?.popularity !== undefined && (
                <Badge
                  variant={getPopularityVariant(pkg.enhancedAnalytics.popularity)}
                  className="text-xs"
                >
                  <Star className="w-3 h-3 mr-1" />
                  {Math.round(pkg.enhancedAnalytics.popularity * 100)}%
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            {pkg.installed ? (
              <>
                {pkg.outdated && (
                  <Button
                    size="sm"
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
                  size="sm"
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
                size="sm"
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
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onPackageSelect(pkg);
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

  // Render package list item
  const renderPackageListItem = (pkg: EnhancedBrewPackage) => (
    <Card
      key={pkg.name}
      className="border-border hover:border-primary/50 transition-all duration-200 cursor-pointer"
      onClick={() => onPackageSelect(pkg)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm">
              📦
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">{pkg.name}</h4>
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
              <p className="text-sm text-muted-foreground truncate">
                {pkg.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {pkg.enhancedAnalytics?.popularity !== undefined && (
              <Badge
                variant={getPopularityVariant(pkg.enhancedAnalytics.popularity)}
                className="text-xs"
              >
                {Math.round(pkg.enhancedAnalytics.popularity * 100)}%
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
                    className="h-8 px-3 text-xs"
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
                  className="h-8 px-3 text-xs"
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
                className="h-8 px-3 text-xs"
              >
                Install
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Categories
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
              {getCategoryIcon(category.id)}
            </div>
            <div>
              <h2 className="text-3xl font-semibold text-foreground">
                {category.id}
              </h2>
              <p className="text-lg text-muted-foreground">
                {stats.total} applications in this category
              </p>
            </div>
          </div>

          {/* Category Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {stats.installed} installed
            </div>
            {stats.outdated > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                {stats.outdated} outdated
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              {stats.popular} popular
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
                <DropdownMenuRadioItem value="all">All packages</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="installed">Installed only</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="not-installed">Not installed</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="outdated">Outdated only</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Sort by {sortBy}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <DropdownMenuRadioItem value="popularity">Popularity</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="updated">Last Updated</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList>
              <TabsTrigger value="grid" className="gap-2">
                <Grid className="w-4 h-4" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="w-4 h-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Results */}
      <div>
        {sortedPackages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No packages found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Showing {sortedPackages.length} of {categoryPackages.length} packages
              </p>
            </div>
            
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedPackages.map(renderPackageCard)}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedPackages.map(renderPackageListItem)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};