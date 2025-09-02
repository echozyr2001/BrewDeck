import React, { useState, useRef, useEffect } from "react";
import { Search, X, Clock, SlidersHorizontal } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";

export interface SearchFilters {
  category?: string;
  installed?: boolean;
  outdated?: boolean;
  popularity?: "high" | "medium" | "low";
}

export interface SortOptions {
  sortBy: "name" | "popularity" | "updated" | "size" | "downloads";
  sortOrder: "asc" | "desc";
}

interface AdvancedSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  sortOptions: SortOptions;
  onSortChange: (options: SortOptions) => void;
  suggestions: string[];
  searchHistory: string[];
  onClearHistory: () => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  query,
  onQueryChange,
  onSearch,
  filters,
  onFiltersChange,
  sortOptions,
  onSortChange,
  suggestions,
  searchHistory,
  onClearHistory,
  loading = false,
  placeholder = "Search packages...",
  className = "",
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
      setShowSuggestions(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Handle search execution
  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    onQueryChange(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (query.trim() || searchHistory.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onQueryChange(value);
    setShowSuggestions(value.trim().length > 0 || searchHistory.length > 0);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  // Get display suggestions (history + live suggestions)
  const displaySuggestions = query.trim()
    ? suggestions
    : searchHistory.slice(0, 5);

  return (
    <div className={`relative ${className}`}>
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder={placeholder}
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                className="pl-12 pr-10 h-12 text-base border-border bg-background"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onQueryChange("");
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Filter Button */}
            <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-4 border-border relative"
                >
                  <SlidersHorizontal className="w-5 h-5 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Installation Status */}
                <div className="p-2">
                  <div className="text-sm font-medium mb-2">Installation Status</div>
                  <div className="space-y-1">
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
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Popularity */}
                <div className="p-2">
                  <div className="text-sm font-medium mb-2">Popularity</div>
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
                    <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </div>

                <DropdownMenuSeparator />

                {/* Sort Options */}
                <div className="p-2">
                  <div className="text-sm font-medium mb-2">Sort By</div>
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
                </div>

                <div className="p-2">
                  <div className="text-sm font-medium mb-2">Order</div>
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
                </div>

                {activeFiltersCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onFiltersChange({
                            category: undefined,
                            installed: undefined,
                            outdated: undefined,
                            popularity: undefined,
                          })
                        }
                        className="w-full"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              size="lg"
              className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
              ) : (
                <Search className="w-5 h-5 mr-2" />
              )}
              Search
            </Button>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              <div className="flex flex-wrap gap-1">
                {filters.installed !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.installed ? "Installed" : "Not installed"}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onFiltersChange({ ...filters, installed: undefined })
                      }
                      className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {filters.outdated && (
                  <Badge variant="secondary" className="text-xs">
                    Outdated
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onFiltersChange({ ...filters, outdated: undefined })
                      }
                      className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
                {filters.popularity && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.popularity} popularity
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onFiltersChange({ ...filters, popularity: undefined })
                      }
                      className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions Dropdown */}
      {showSuggestions && (displaySuggestions.length > 0 || searchHistory.length > 0) && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 z-50"
        >
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-2">
              {/* Search History */}
              {!query.trim() && searchHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Recent searches
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClearHistory}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {searchHistory.slice(0, 5).map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(item)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {item}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Suggestions */}
              {query.trim() && suggestions.length > 0 && (
                <div>
                  {!query.trim() && searchHistory.length > 0 && (
                    <Separator className="my-2" />
                  )}
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Suggestions
                  </div>
                  <div className="space-y-1">
                    {suggestions.slice(0, 5).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {suggestion.split(new RegExp(`(${query})`, 'gi')).map((part, i) => 
                              part.toLowerCase() === query.toLowerCase() ? (
                                <mark key={i} className="bg-primary/20 text-primary px-0 rounded">
                                  {part}
                                </mark>
                              ) : (
                                part
                              )
                            )}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};