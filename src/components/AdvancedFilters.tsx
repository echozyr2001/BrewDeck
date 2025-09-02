import React, { useState } from "react";
import { 
  Filter, 
  SlidersHorizontal, 
  Grid, 
  List, 
  Settings, 
  RotateCcw,
  Download,
  Upload
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { useUserPreferences } from "../hooks/useUserPreferences";
import type { SearchFilters, SortOptions } from "../hooks/usePackageSearch";

interface AdvancedFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  sortOptions: SortOptions;
  onSortChange: (options: SortOptions) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  className?: string;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  sortOptions,
  onSortChange,
  viewMode,
  onViewModeChange,
  className = "",
}) => {
  const {
    preferences,
    updateViewPreferences,
    updateFilterPreferences,
    updateSearchPreferences,
    resetPreferences,
    exportPreferences,
    importPreferences,
  } = useUserPreferences();

  const [showPreferences, setShowPreferences] = useState(false);

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  // Handle filter reset
  const handleResetFilters = () => {
    onFiltersChange({
      category: undefined,
      installed: undefined,
      outdated: undefined,
      popularity: undefined,
    });
    onSortChange({
      sortBy: preferences.filter.defaultSortBy,
      sortOrder: preferences.filter.defaultSortOrder,
    });
  };

  // Handle preferences export
  const handleExportPreferences = () => {
    const data = exportPreferences();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brewdeck-preferences.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle preferences import
  const handleImportPreferences = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        if (importPreferences(data)) {
          // Apply imported preferences
          onSortChange({
            sortBy: preferences.filter.defaultSortBy,
            sortOrder: preferences.filter.defaultSortOrder,
          });
          onViewModeChange(preferences.view.viewMode);
        }
      };
      reader.readAsText(file);
    }
    // Reset input
    event.target.value = "";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Quick Filters */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Quick Filters</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Installation Status */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Installation Status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuCheckboxItem
                checked={filters.installed === true}
                onCheckedChange={(checked) =>
                  onFiltersChange({
                    ...filters,
                    installed: checked ? true : undefined,
                  })
                }
              >
                Installed only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.installed === false}
                onCheckedChange={(checked) =>
                  onFiltersChange({
                    ...filters,
                    installed: checked ? false : undefined,
                  })
                }
              >
                Not installed only
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.outdated === true}
                onCheckedChange={(checked) =>
                  onFiltersChange({
                    ...filters,
                    outdated: checked ? true : undefined,
                  })
                }
              >
                Outdated only
              </DropdownMenuCheckboxItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Popularity */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Popularity</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={filters.popularity || ""}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    popularity: value as "high" | "medium" | "low" | undefined,
                  })
                }
              >
                <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="high">High (70%+)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="medium">Medium (30-70%)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="low">Low (&lt;30%)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {activeFiltersCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="w-full justify-start gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Clear All Filters
              </Button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Sort: {sortOptions.sortBy}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={sortOptions.sortBy}
            onValueChange={(value) =>
              onSortChange({
                ...sortOptions,
                sortBy: value as "name" | "popularity" | "updated" | "size",
              })
            }
          >
            <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="popularity">Popularity</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="updated">Last Updated</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Order</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortOptions.sortOrder}
            onValueChange={(value) =>
              onSortChange({
                ...sortOptions,
                sortOrder: value as "asc" | "desc",
              })
            }
          >
            <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Mode Toggle */}
      <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as "grid" | "list")}>
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

      {/* Advanced Preferences */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View & Filter Preferences</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="view" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="view">View</TabsTrigger>
              <TabsTrigger value="filter">Filters</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
            </TabsList>
            
            <TabsContent value="view" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Display Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Show Package Icons</label>
                      <p className="text-xs text-muted-foreground">Display icons in package cards</p>
                    </div>
                    <Switch
                      checked={preferences.view.showPackageIcons}
                      onCheckedChange={(checked: boolean) =>
                        updateViewPreferences({ showPackageIcons: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Show Analytics</label>
                      <p className="text-xs text-muted-foreground">Display popularity and download stats</p>
                    </div>
                    <Switch
                      checked={preferences.view.showAnalytics}
                      onCheckedChange={(checked: boolean) =>
                        updateViewPreferences({ showAnalytics: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Show Descriptions</label>
                      <p className="text-xs text-muted-foreground">Display package descriptions</p>
                    </div>
                    <Switch
                      checked={preferences.view.showDescriptions}
                      onCheckedChange={(checked: boolean) =>
                        updateViewPreferences({ showDescriptions: checked })
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Grid Density</label>
                    <DropdownMenuRadioGroup
                      value={preferences.view.gridDensity}
                      onValueChange={(value) =>
                        updateViewPreferences({ gridDensity: value as "compact" | "comfortable" | "spacious" })
                      }
                    >
                      <div className="flex gap-2">
                        <Button
                          variant={preferences.view.gridDensity === "compact" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateViewPreferences({ gridDensity: "compact" })}
                        >
                          Compact
                        </Button>
                        <Button
                          variant={preferences.view.gridDensity === "comfortable" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateViewPreferences({ gridDensity: "comfortable" })}
                        >
                          Comfortable
                        </Button>
                        <Button
                          variant={preferences.view.gridDensity === "spacious" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateViewPreferences({ gridDensity: "spacious" })}
                        >
                          Spacious
                        </Button>
                      </div>
                    </DropdownMenuRadioGroup>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="filter" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Default Sort Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Sort By</label>
                    <DropdownMenuRadioGroup
                      value={preferences.filter.defaultSortBy}
                      onValueChange={(value) =>
                        updateFilterPreferences({ 
                          defaultSortBy: value as "name" | "popularity" | "updated" | "size" | "downloads"
                        })
                      }
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {["name", "popularity", "updated", "size", "downloads"].map((option) => (
                          <Button
                            key={option}
                            variant={preferences.filter.defaultSortBy === option ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateFilterPreferences({ 
                              defaultSortBy: option as "name" | "popularity" | "updated" | "size" | "downloads"
                            })}
                            className="capitalize"
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </DropdownMenuRadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Sort Order</label>
                    <div className="flex gap-2">
                      <Button
                        variant={preferences.filter.defaultSortOrder === "asc" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilterPreferences({ defaultSortOrder: "asc" })}
                      >
                        Ascending
                      </Button>
                      <Button
                        variant={preferences.filter.defaultSortOrder === "desc" ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilterPreferences({ defaultSortOrder: "desc" })}
                      >
                        Descending
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Remember Filters</label>
                      <p className="text-xs text-muted-foreground">Save filter state between sessions</p>
                    </div>
                    <Switch
                      checked={preferences.filter.rememberFilters}
                      onCheckedChange={(checked) =>
                        updateFilterPreferences({ rememberFilters: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="search" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Search Behavior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Enable Suggestions</label>
                      <p className="text-xs text-muted-foreground">Show search suggestions and history</p>
                    </div>
                    <Switch
                      checked={preferences.search.enableSuggestions}
                      onCheckedChange={(checked: boolean) =>
                        updateSearchPreferences({ enableSuggestions: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Highlight Matches</label>
                      <p className="text-xs text-muted-foreground">Highlight search terms in results</p>
                    </div>
                    <Switch
                      checked={preferences.search.highlightMatches}
                      onCheckedChange={(checked: boolean) =>
                        updateSearchPreferences({ highlightMatches: checked })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Search Delay: {preferences.search.debounceDelay}ms
                    </label>
                    <Slider
                      value={[preferences.search.debounceDelay]}
                      onValueChange={([value]: number[]) =>
                        updateSearchPreferences({ debounceDelay: value })
                      }
                      min={100}
                      max={1000}
                      step={100}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Max History Items: {preferences.search.maxHistoryItems}
                    </label>
                    <Slider
                      value={[preferences.search.maxHistoryItems]}
                      onValueChange={([value]: number[]) =>
                        updateSearchPreferences({ maxHistoryItems: value })
                      }
                      min={5}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <Separator />
          
          {/* Preferences Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPreferences}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("import-preferences")?.click()}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </Button>
              <input
                id="import-preferences"
                type="file"
                accept=".json"
                onChange={handleImportPreferences}
                className="hidden"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetPreferences}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};