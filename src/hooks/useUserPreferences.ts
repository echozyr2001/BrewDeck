import { useState, useEffect, useCallback } from "react";

export interface ViewPreferences {
  viewMode: "grid" | "list";
  gridDensity: "compact" | "comfortable" | "spacious";
  listDensity: "compact" | "comfortable";
  showPackageIcons: boolean;
  showAnalytics: boolean;
  showDescriptions: boolean;
  cardsPerRow: number;
}

export interface FilterPreferences {
  defaultSortBy: "name" | "popularity" | "updated" | "size" | "downloads";
  defaultSortOrder: "asc" | "desc";
  rememberFilters: boolean;
  autoApplyFilters: boolean;
}

export interface SearchPreferences {
  maxHistoryItems: number;
  enableSuggestions: boolean;
  debounceDelay: number;
  highlightMatches: boolean;
}

export interface UserPreferences {
  view: ViewPreferences;
  filter: FilterPreferences;
  search: SearchPreferences;
  theme: "light" | "dark" | "system";
  animations: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  view: {
    viewMode: "grid",
    gridDensity: "comfortable",
    listDensity: "comfortable",
    showPackageIcons: true,
    showAnalytics: true,
    showDescriptions: true,
    cardsPerRow: 3,
  },
  filter: {
    defaultSortBy: "popularity",
    defaultSortOrder: "desc",
    rememberFilters: true,
    autoApplyFilters: false,
  },
  search: {
    maxHistoryItems: 10,
    enableSuggestions: true,
    debounceDelay: 500,
    highlightMatches: true,
  },
  theme: "system",
  animations: true,
};

const PREFERENCES_KEY = "brewdeck-user-preferences";

// Load preferences from localStorage
const loadPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new preference keys
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        view: { ...DEFAULT_PREFERENCES.view, ...parsed.view },
        filter: { ...DEFAULT_PREFERENCES.filter, ...parsed.filter },
        search: { ...DEFAULT_PREFERENCES.search, ...parsed.search },
      };
    }
  } catch (error) {
    console.warn("Failed to load user preferences:", error);
  }
  return DEFAULT_PREFERENCES;
};

// Save preferences to localStorage
const savePreferences = (preferences: UserPreferences): void => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn("Failed to save user preferences:", error);
  }
};

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);

  // Save preferences whenever they change
  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  // Update specific preference sections
  const updateViewPreferences = useCallback((updates: Partial<ViewPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      view: { ...prev.view, ...updates },
    }));
  }, []);

  const updateFilterPreferences = useCallback((updates: Partial<FilterPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      filter: { ...prev.filter, ...updates },
    }));
  }, []);

  const updateSearchPreferences = useCallback((updates: Partial<SearchPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      search: { ...prev.search, ...updates },
    }));
  }, []);

  // Update entire preferences
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  // Export/import preferences
  const exportPreferences = useCallback((): string => {
    return JSON.stringify(preferences, null, 2);
  }, [preferences]);

  const importPreferences = useCallback((data: string): boolean => {
    try {
      const imported = JSON.parse(data);
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...imported,
        view: { ...DEFAULT_PREFERENCES.view, ...imported.view },
        filter: { ...DEFAULT_PREFERENCES.filter, ...imported.filter },
        search: { ...DEFAULT_PREFERENCES.search, ...imported.search },
      });
      return true;
    } catch (error) {
      console.warn("Failed to import preferences:", error);
      return false;
    }
  }, []);

  return {
    preferences,
    updateViewPreferences,
    updateFilterPreferences,
    updateSearchPreferences,
    updatePreferences,
    resetPreferences,
    exportPreferences,
    importPreferences,
  };
};