import { useCallback, useEffect, useMemo, useState } from "react";
import { useBrewStore } from "../stores/brewStore";
import type { EnhancedBrewPackage } from "../stores/brewStore";

// Inline debounce hook to avoid import issues
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

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

// Search history management
const SEARCH_HISTORY_KEY = "brewdeck-search-history";
const MAX_HISTORY_ITEMS = 10;

const getSearchHistory = (): string[] => {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

const addToSearchHistory = (query: string): void => {
  if (!query.trim()) return;
  
  try {
    const history = getSearchHistory();
    const filtered = history.filter(item => item !== query);
    const newHistory = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  } catch {
    // Ignore localStorage errors
  }
};

const clearSearchHistory = (): void => {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // Ignore localStorage errors
  }
};

/**
 * Custom hook for package search with debouncing and filtering
 * Provides advanced search capabilities with real-time results
 */
export const usePackageSearch = (packageType: "formula" | "cask") => {
  const {
    searchQuery,
    setSearchQuery,
    searchPackages,
    getSearchResults,
    getPackagesByType,
    loading,
    selectedCategory,
    setSelectedCategory,
  } = useBrewStore();

  // Local state for advanced search features
  const [searchHistory, setSearchHistory] = useState<string[]>(getSearchHistory());
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    sortBy: "name",
    sortOrder: "asc",
  });

  // Debounce search query to avoid excessive API calls
  const debouncedQuery = useDebounce(searchQuery, 500);

  // Get search results for the current package type
  const searchResults = useMemo(
    () => getSearchResults(packageType),
    [getSearchResults, packageType]
  );

  // Get all packages for filtering when not searching
  const allPackages = useMemo(
    () => getPackagesByType(packageType),
    [getPackagesByType, packageType]
  );

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      searchPackages(debouncedQuery, packageType);
    }
  }, [debouncedQuery, packageType, searchPackages]);

  // Search function with immediate UI update and history tracking
  const search = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        addToSearchHistory(query.trim());
        setSearchHistory(getSearchHistory());
      }
    },
    [setSearchQuery]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, [setSearchQuery]);

  // Clear search history
  const clearHistory = useCallback(() => {
    clearSearchHistory();
    setSearchHistory([]);
  }, []);

  // Filter packages based on criteria
  const filterPackages = useCallback(
    (
      packages: EnhancedBrewPackage[],
      filters: SearchFilters
    ): EnhancedBrewPackage[] => {
      return packages.filter((pkg) => {
        // Category filter
        if (filters.category && pkg.category !== filters.category) {
          return false;
        }

        // Installation status filter
        if (
          filters.installed !== undefined &&
          pkg.installed !== filters.installed
        ) {
          return false;
        }

        // Outdated filter
        if (
          filters.outdated !== undefined &&
          pkg.outdated !== filters.outdated
        ) {
          return false;
        }

        // Popularity filter
        if (filters.popularity && pkg.enhancedAnalytics) {
          const popularity = pkg.enhancedAnalytics.popularity;
          switch (filters.popularity) {
            case "high":
              if (popularity < 0.7) return false;
              break;
            case "medium":
              if (popularity < 0.3 || popularity >= 0.7) return false;
              break;
            case "low":
              if (popularity >= 0.3) return false;
              break;
          }
        }

        return true;
      });
    },
    []
  );

  // Sort packages based on criteria
  const sortPackages = useCallback(
    (
      packages: EnhancedBrewPackage[],
      options: SortOptions
    ): EnhancedBrewPackage[] => {
      return [...packages].sort((a, b) => {
        let comparison = 0;

        switch (options.sortBy) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "popularity":
            const aPopularity = a.enhancedAnalytics?.popularity || 0;
            const bPopularity = b.enhancedAnalytics?.popularity || 0;
            comparison = aPopularity - bPopularity;
            break;
          case "downloads":
            const aDownloads = a.enhancedAnalytics?.downloads365d || 0;
            const bDownloads = b.enhancedAnalytics?.downloads365d || 0;
            comparison = aDownloads - bDownloads;
            break;
          case "updated":
            const aUpdated = a.lastUpdated?.getTime() || 0;
            const bUpdated = b.lastUpdated?.getTime() || 0;
            comparison = aUpdated - bUpdated;
            break;
          case "size":
            const aSize = a.installSize || 0;
            const bSize = b.installSize || 0;
            comparison = aSize - bSize;
            break;
        }

        return options.sortOrder === "desc" ? -comparison : comparison;
      });
    },
    []
  );

  // Get filtered and sorted results with current state
  const getFilteredResults = useCallback(
    (
      customFilters?: SearchFilters,
      customSortOptions?: SortOptions
    ) => {
      // Use search results if searching, otherwise use all packages
      const basePackages = searchQuery.trim() ? searchResults : allPackages;

      // Merge filters with current state
      const effectiveFilters = {
        ...filters,
        ...customFilters,
        category: customFilters?.category || filters.category || selectedCategory,
      };

      // Merge sort options with current state
      const effectiveSortOptions = {
        ...sortOptions,
        ...customSortOptions,
      };

      const filtered = filterPackages(basePackages, effectiveFilters);
      return sortPackages(filtered, effectiveSortOptions);
    },
    [
      searchQuery,
      searchResults,
      allPackages,
      selectedCategory,
      filters,
      sortOptions,
      filterPackages,
      sortPackages,
    ]
  );

  // Update filters
  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  // Update sort options
  const updateSortOptions = useCallback((newSortOptions: SortOptions) => {
    setSortOptions(newSortOptions);
  }, []);

  // Quick search for installed packages
  const searchInstalled = useCallback(
    (query: string = "") => {
      const installedPackages = allPackages.filter((pkg) => pkg.installed);
      if (!query.trim()) return installedPackages;

      return installedPackages.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(query.toLowerCase()) ||
          pkg.description.toLowerCase().includes(query.toLowerCase())
      );
    },
    [allPackages]
  );

  // Quick search for outdated packages
  const searchOutdated = useCallback(
    (query: string = "") => {
      const outdatedPackages = allPackages.filter((pkg) => pkg.outdated);
      if (!query.trim()) return outdatedPackages;

      return outdatedPackages.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(query.toLowerCase()) ||
          pkg.description.toLowerCase().includes(query.toLowerCase())
      );
    },
    [allPackages]
  );

  // Get search suggestions based on current query
  const getSearchSuggestions = useCallback(
    (limit: number = 5): string[] => {
      if (!searchQuery.trim()) return [];

      const query = searchQuery.toLowerCase();
      const suggestions = new Set<string>();

      // Add exact matches first
      allPackages.forEach((pkg) => {
        if (pkg.name.toLowerCase().startsWith(query)) {
          suggestions.add(pkg.name);
        }
      });

      // Add partial matches
      if (suggestions.size < limit) {
        allPackages.forEach((pkg) => {
          if (suggestions.size >= limit) return;
          if (
            pkg.name.toLowerCase().includes(query) &&
            !suggestions.has(pkg.name)
          ) {
            suggestions.add(pkg.name);
          }
        });
      }

      return Array.from(suggestions).slice(0, limit);
    },
    [searchQuery, allPackages]
  );

  return {
    // Search state
    searchQuery,
    searchResults,
    isSearching: loading.search,
    hasResults: searchResults.length > 0,

    // Search actions
    search,
    clearSearch,

    // Advanced search features
    searchHistory,
    clearHistory,
    filters,
    updateFilters,
    sortOptions,
    updateSortOptions,

    // Filtering and sorting
    getFilteredResults,
    filterPackages,
    sortPackages,

    // Quick searches
    searchInstalled,
    searchOutdated,

    // Suggestions
    getSearchSuggestions,

    // Category management
    selectedCategory,
    setSelectedCategory,

    // Raw data access
    allPackages,
  };
};

export default usePackageSearch;
