import React, { useState, useMemo } from "react";
import { Search, Package, Star, TrendingUp, Filter, Grid, List } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
import { categories, type Category } from "../data/categories";
import { getCategoryIcon } from "../utils/categoryUtils";
import { useBrewStore } from "../stores/brewStore";
import type { EnhancedBrewPackage } from "../stores/brewStore";

interface CategoryBrowserProps {
  onCategorySelect: (category: Category) => void;
  onPackageSelect: (pkg: EnhancedBrewPackage) => void;
  className?: string;
}

type SortOption = "name" | "popularity" | "package-count" | "featured";
type ViewMode = "grid" | "list";

// Enhanced category with analytics
interface EnhancedCategory extends Category {
  packageCount: number;
  installedCount: number;
  featuredPackages: EnhancedBrewPackage[];
  popularity: number;
  trending: boolean;
}

export const CategoryBrowser: React.FC<CategoryBrowserProps> = ({
  onCategorySelect,
  onPackageSelect,
  className = "",
}) => {
  const { getPackagesByType } = useBrewStore();
  
  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popularity");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  // Removed unused selectedCategory state

  // Get all cask packages for analytics
  const allCasks = getPackagesByType("cask");

  // Create enhanced categories with analytics
  const enhancedCategories = useMemo((): EnhancedCategory[] => {
    return categories.map((category) => {
      // Find packages in this category
      const categoryPackages = allCasks.filter(pkg => 
        category.casks.includes(pkg.name)
      );

      // Calculate analytics
      const packageCount = category.casks.length;
      const installedCount = categoryPackages.filter(pkg => pkg.installed).length;
      
      // Get featured packages (top 3 by popularity or installed status)
      const featuredPackages = categoryPackages
        .sort((a, b) => {
          // Prioritize installed packages
          if (a.installed && !b.installed) return -1;
          if (!a.installed && b.installed) return 1;
          
          // Then by popularity
          const aPopularity = a.enhancedAnalytics?.popularity || 0;
          const bPopularity = b.enhancedAnalytics?.popularity || 0;
          return bPopularity - aPopularity;
        })
        .slice(0, 3);

      // Calculate category popularity (average of package popularities)
      const totalPopularity = categoryPackages.reduce((sum, pkg) => 
        sum + (pkg.enhancedAnalytics?.popularity || 0), 0
      );
      const popularity = categoryPackages.length > 0 ? totalPopularity / categoryPackages.length : 0;

      // Determine if trending (high install rate or popular packages)
      const trending = installedCount > packageCount * 0.3 || popularity > 0.6;

      return {
        ...category,
        packageCount,
        installedCount,
        featuredPackages,
        popularity,
        trending,
      };
    });
  }, [allCasks]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return enhancedCategories;
    
    const query = searchQuery.toLowerCase();
    return enhancedCategories.filter(category =>
      category.id.toLowerCase().includes(query) ||
      category.casks.some(cask => cask.toLowerCase().includes(query))
    );
  }, [enhancedCategories, searchQuery]);

  // Sort categories
  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.id.localeCompare(b.id);
        case "popularity":
          return b.popularity - a.popularity;
        case "package-count":
          return b.packageCount - a.packageCount;
        case "featured":
          // Trending first, then by popularity
          if (a.trending && !b.trending) return -1;
          if (!a.trending && b.trending) return 1;
          return b.popularity - a.popularity;
        default:
          return 0;
      }
    });
  }, [filteredCategories, sortBy]);

  // Handle category click
  const handleCategoryClick = (category: Category) => {
    onCategorySelect(category);
  };

  // Render category card
  const renderCategoryCard = (category: EnhancedCategory) => (
    <Card
      key={category.id}
      className="border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group"
      onClick={() => handleCategoryClick(category)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
              {getCategoryIcon(category.id)}
            </div>
            <div>
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {category.id}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {category.packageCount} packages
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            {category.trending && (
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                <TrendingUp className="w-3 h-3 mr-1" />
                Trending
              </Badge>
            )}
            {category.installedCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {category.installedCount} installed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Featured Packages */}
        {category.featuredPackages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="w-3 h-3" />
              Featured packages
            </div>
            <div className="space-y-1">
              {category.featuredPackages.map((pkg) => (
                <div
                  key={pkg.name}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPackageSelect(pkg);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-xs">
                      📦
                    </div>
                    <span className="text-sm font-medium truncate">{pkg.name}</span>
                    {pkg.installed && (
                      <Badge variant="secondary" className="text-xs h-4">
                        ✓
                      </Badge>
                    )}
                  </div>
                  {pkg.enhancedAnalytics?.popularity && (
                    <div className="text-xs text-muted-foreground">
                      {Math.round(pkg.enhancedAnalytics.popularity * 100)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Stats */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {category.packageCount}
            </div>
            {category.popularity > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {Math.round(category.popularity * 100)}%
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              handleCategoryClick(category);
            }}
          >
            Browse →
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render category list item
  const renderCategoryListItem = (category: EnhancedCategory) => (
    <Card
      key={category.id}
      className="border-border hover:border-primary/50 transition-all duration-200 cursor-pointer"
      onClick={() => handleCategoryClick(category)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              {getCategoryIcon(category.id)}
            </div>
            <div>
              <h4 className="font-medium">{category.id}</h4>
              <p className="text-sm text-muted-foreground">
                {category.packageCount} packages
                {category.installedCount > 0 && ` • ${category.installedCount} installed`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {category.trending && (
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                Trending
              </Badge>
            )}
            {category.popularity > 0 && (
              <div className="text-sm text-muted-foreground">
                {Math.round(category.popularity * 100)}% popular
              </div>
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
        <div>
          <h2 className="text-3xl font-semibold text-foreground mb-3">
            Browse Categories
          </h2>
          <p className="text-lg text-muted-foreground">
            Discover applications organized by category with featured recommendations.
          </p>
        </div>

        {/* Search and Controls */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Sort by
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <DropdownMenuRadioItem value="featured">Featured</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="popularity">Popularity</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="package-count">Package Count</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
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

      {/* Categories Display */}
      <div>
        {sortedCategories.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No categories found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedCategories.map(renderCategoryCard)}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCategories.map(renderCategoryListItem)}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="flex items-center justify-center gap-8 pt-6 border-t border-border text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          {categories.length} categories
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4" />
          {enhancedCategories.filter(c => c.trending).length} trending
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {enhancedCategories.reduce((sum, c) => sum + c.packageCount, 0)} total packages
        </div>
      </div>
    </div>
  );
};