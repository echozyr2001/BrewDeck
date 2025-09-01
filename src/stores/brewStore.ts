import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";

export interface BrewPackage {
  name: string;
  version: string;
  description: string;
  installed: boolean;
  outdated: boolean;
  homepage: string;
  dependencies: string[];
  conflicts: string[];
  caveats: string;
  analytics: number;
}

export interface PackageAnalytics {
  downloads365d: number;
  popularity: number;
  rating?: number;
}

export interface PackageWarning {
  type: "security" | "compatibility" | "deprecated" | "experimental";
  message: string;
  severity: "low" | "medium" | "high";
}

export interface EnhancedBrewPackage extends BrewPackage {
  category?: string;
  warnings?: PackageWarning[];
  installSize?: number;
  lastUpdated?: Date;
  enhancedAnalytics?: PackageAnalytics;
}

export interface BrewInfo {
  packages: EnhancedBrewPackage[];
  total_installed: number;
  total_outdated: number;
}

export interface PackageOperation {
  id: string;
  type: "install" | "uninstall" | "update";
  packageName: string;
  packageType: "formula" | "cask";
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
  message?: string;
  startTime: Date;
  endTime?: Date;
}

export interface LoadingState {
  formulae: boolean;
  casks: boolean;
  search: boolean;
  operations: Record<string, boolean>; // operationId -> loading
}

export interface CacheState {
  formulae: {
    data: BrewInfo | null;
    lastFetch: number | null;
    searchResults: EnhancedBrewPackage[];
    searchQuery: string;
  };
  casks: {
    data: BrewInfo | null;
    lastFetch: number | null;
    searchResults: EnhancedBrewPackage[];
    searchQuery: string;
  };
  timeout: number; // 5 minutes
}

interface BrewStore {
  // Data - Separated by package type
  formulae: Record<string, EnhancedBrewPackage>;
  casks: Record<string, EnhancedBrewPackage>;

  // UI State
  activeView: "discover" | "installed" | "search" | "updates";
  activeTab: "formula" | "cask"; // Tab within each view
  searchQuery: string;
  selectedCategory?: string;

  // Operation State
  loading: LoadingState;
  operations: Record<string, PackageOperation>;
  message: string;

  // Cache State
  cache: CacheState;

  // Actions
  setActiveView: (
    view: "discover" | "installed" | "search" | "updates"
  ) => void;
  setActiveTab: (tab: "formula" | "cask") => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category?: string) => void;
  setMessage: (message: string) => void;
  clearMessage: () => void;

  // Async actions
  loadPackages: (packageType: "formula" | "cask") => Promise<void>;
  searchPackages: (
    query: string,
    packageType: "formula" | "cask"
  ) => Promise<void>;
  installPackage: (
    packageName: string,
    packageType: "formula" | "cask"
  ) => Promise<void>;
  uninstallPackage: (
    packageName: string,
    packageType: "formula" | "cask"
  ) => Promise<void>;
  updatePackage: (
    packageName: string,
    packageType: "formula" | "cask"
  ) => Promise<void>;
  updateAllPackages: (packageType: "formula" | "cask") => Promise<void>;

  // Operation management
  addOperation: (
    operation: Omit<PackageOperation, "id" | "startTime">
  ) => string;
  updateOperation: (id: string, updates: Partial<PackageOperation>) => void;
  removeOperation: (id: string) => void;
  getActiveOperations: () => PackageOperation[];

  // Cache management
  shouldRefetch: (packageType: "formula" | "cask") => boolean;
  clearCache: (packageType?: "formula" | "cask") => void;

  // Helper methods
  getPackagesByType: (packageType: "formula" | "cask") => EnhancedBrewPackage[];
  getInstalledPackages: (
    packageType: "formula" | "cask"
  ) => EnhancedBrewPackage[];
  getOutdatedPackages: (
    packageType: "formula" | "cask"
  ) => EnhancedBrewPackage[];
  getSearchResults: (packageType: "formula" | "cask") => EnhancedBrewPackage[];
}

export const useBrewStore = create<BrewStore>()(
  persist(
    (set, get) => ({
      // Initial state
      formulae: {},
      casks: {},

      // UI State
      activeView: "discover",
      activeTab: "formula",
      searchQuery: "",
      selectedCategory: undefined,

      // Operation State
      loading: {
        formulae: false,
        casks: false,
        search: false,
        operations: {},
      },
      operations: {},
      message: "",

      // Cache State
      cache: {
        formulae: {
          data: null,
          lastFetch: null,
          searchResults: [],
          searchQuery: "",
        },
        casks: {
          data: null,
          lastFetch: null,
          searchResults: [],
          searchQuery: "",
        },
        timeout: 5 * 60 * 1000, // 5 minutes
      },

      // State setters
      setActiveView: (view) => {
        set({ activeView: view });
        // Load data for the new view if needed
        const { activeTab } = get();
        if (view !== "discover") {
          get().loadPackages(activeTab);
        }
      },

      setActiveTab: (tab) => {
        set({ activeTab: tab });
        // Load data for the new tab if needed
        const { activeView } = get();
        if (activeView !== "discover") {
          get().loadPackages(tab);
        }
      },

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSelectedCategory: (category) => set({ selectedCategory: category }),

      setMessage: (message) => set({ message }),

      clearMessage: () => set({ message: "" }),

      // Cache management
      shouldRefetch: (packageType) => {
        const { cache } = get();
        const cacheKey = packageType === "formula" ? "formulae" : "casks";
        const cacheData = cache[cacheKey];
        return (
          !cacheData.lastFetch ||
          Date.now() - cacheData.lastFetch > cache.timeout
        );
      },

      clearCache: (packageType) => {
        if (!packageType) {
          set((state) => ({
            cache: {
              ...state.cache,
              formulae: {
                ...state.cache.formulae,
                data: null,
                lastFetch: null,
              },
              casks: { ...state.cache.casks, data: null, lastFetch: null },
            },
          }));
        } else {
          const cacheKey = packageType === "formula" ? "formulae" : "casks";
          set((state) => ({
            cache: {
              ...state.cache,
              [cacheKey]: {
                ...state.cache[cacheKey],
                data: null,
                lastFetch: null,
              },
            },
          }));
        }
      },

      // Operation management
      addOperation: (operation) => {
        const id = `${operation.type}-${operation.packageName}-${Date.now()}`;
        const fullOperation: PackageOperation = {
          ...operation,
          id,
          startTime: new Date(),
        };

        set((state) => ({
          operations: { ...state.operations, [id]: fullOperation },
          loading: {
            ...state.loading,
            operations: { ...state.loading.operations, [id]: true },
          },
        }));

        return id;
      },

      updateOperation: (id, updates) => {
        set((state) => ({
          operations: {
            ...state.operations,
            [id]: { ...state.operations[id], ...updates },
          },
          loading: {
            ...state.loading,
            operations: {
              ...state.loading.operations,
              [id]: updates.status === "running",
            },
          },
        }));
      },

      removeOperation: (id) => {
        set((state) => {
          const { [id]: removed, ...remainingOperations } = state.operations;
          const { [id]: removedLoading, ...remainingLoading } =
            state.loading.operations;

          return {
            operations: remainingOperations,
            loading: {
              ...state.loading,
              operations: remainingLoading,
            },
          };
        });
      },

      getActiveOperations: () => {
        const { operations } = get();
        return Object.values(operations).filter(
          (op) => op.status === "pending" || op.status === "running"
        );
      },

      // Helper methods
      getPackagesByType: (packageType) => {
        const state = get();
        const storeKey = packageType === "formula" ? "formulae" : "casks";
        return Object.values(state[storeKey]);
      },

      getInstalledPackages: (packageType) => {
        const state = get();
        const storeKey = packageType === "formula" ? "formulae" : "casks";
        return Object.values(state[storeKey]).filter((pkg) => pkg.installed);
      },

      getOutdatedPackages: (packageType) => {
        const state = get();
        const storeKey = packageType === "formula" ? "formulae" : "casks";
        return Object.values(state[storeKey]).filter((pkg) => pkg.outdated);
      },

      getSearchResults: (packageType) => {
        const { cache } = get();
        const cacheKey = packageType === "formula" ? "formulae" : "casks";
        return cache[cacheKey].searchResults;
      },

      // Async actions
      loadPackages: async (packageType) => {
        const { cache, shouldRefetch } = get();
        const cacheKey = packageType === "formula" ? "formulae" : "casks";
        const storeKey = packageType === "formula" ? "formulae" : "casks";
        const cached = cache[cacheKey].data;

        // If we have cached data, expose it immediately
        if (cached) {
          const packages = cached.packages.reduce((acc, pkg) => {
            acc[pkg.name] = pkg;
            return acc;
          }, {} as Record<string, EnhancedBrewPackage>);

          set((state) => ({
            [storeKey]: packages,
          }));
        }

        const needsRefetch = shouldRefetch(packageType);

        // Set loading state
        if (!cached) {
          set((state) => ({
            loading: { ...state.loading, [storeKey]: true },
          }));
        } else if (!needsRefetch) {
          // Fresh cache, nothing to do
          return;
        }

        try {
          const info = await invoke<BrewInfo>(
            packageType === "formula" ? "get_brew_info" : "get_cask_info"
          );

          // Convert array to object for easier access
          const packages = info.packages.reduce((acc, pkg) => {
            acc[pkg.name] = pkg;
            return acc;
          }, {} as Record<string, EnhancedBrewPackage>);

          set((state) => ({
            [storeKey]: packages,
            cache: {
              ...state.cache,
              [cacheKey]: {
                ...state.cache[cacheKey],
                data: info,
                lastFetch: Date.now(),
              },
            },
            loading: { ...state.loading, [storeKey]: false },
          }));

          // Prefetch the other type in background if not cached yet
          const otherType: "formula" | "cask" =
            packageType === "formula" ? "cask" : "formula";
          const otherCacheKey = otherType === "formula" ? "formulae" : "casks";
          const hasOther = get().cache[otherCacheKey].data;
          if (!hasOther) {
            (async () => {
              try {
                const otherInfo = await invoke<BrewInfo>(
                  otherType === "formula" ? "get_brew_info" : "get_cask_info"
                );
                set((state) => ({
                  cache: {
                    ...state.cache,
                    [otherCacheKey]: {
                      ...state.cache[otherCacheKey],
                      data: otherInfo,
                      lastFetch: Date.now(),
                    },
                  },
                }));
              } catch {
                // silent prefetch failure
              }
            })();
          }
        } catch (error) {
          set((state) => ({
            message: `Error loading ${packageType} packages: ${error}`,
            loading: { ...state.loading, [storeKey]: false },
          }));
        }
      },

      searchPackages: async (
        query: string,
        packageType: "formula" | "cask"
      ) => {
        const cacheKey = packageType === "formula" ? "formulae" : "casks";

        if (!query.trim()) {
          set((state) => ({
            cache: {
              ...state.cache,
              [cacheKey]: {
                ...state.cache[cacheKey],
                searchResults: [],
                searchQuery: "",
              },
            },
          }));
          return;
        }

        set((state) => ({
          loading: { ...state.loading, search: true },
          cache: {
            ...state.cache,
            [cacheKey]: {
              ...state.cache[cacheKey],
              searchQuery: query,
            },
          },
        }));

        try {
          const results = await invoke<EnhancedBrewPackage[]>(
            packageType === "formula" ? "search_packages" : "search_casks",
            { query }
          );

          set((state) => ({
            cache: {
              ...state.cache,
              [cacheKey]: {
                ...state.cache[cacheKey],
                searchResults: results,
              },
            },
            loading: { ...state.loading, search: false },
          }));
        } catch (error) {
          set((state) => ({
            message: `Error searching ${packageType} packages: ${error}`,
            loading: { ...state.loading, search: false },
          }));
        }
      },

      installPackage: async (
        packageName: string,
        packageType: "formula" | "cask"
      ) => {
        const {
          addOperation,
          updateOperation,
          removeOperation,
          activeView,
          loadPackages,
        } = get();

        const operationId = addOperation({
          type: "install",
          packageName,
          packageType,
          status: "pending",
        });

        try {
          updateOperation(operationId, { status: "running" });

          const result = await invoke<string>(
            packageType === "formula" ? "install_package" : "install_cask",
            { packageName }
          );

          updateOperation(operationId, {
            status: "completed",
            message: result,
            endTime: new Date(),
          });

          set({ message: result });

          // Refresh data if we're not in discover view
          if (activeView !== "discover") {
            await loadPackages(packageType);
          }

          // Remove completed operation after a delay
          setTimeout(() => removeOperation(operationId), 5000);
        } catch (error) {
          const errorMessage = `Error installing package: ${error}`;
          updateOperation(operationId, {
            status: "failed",
            message: errorMessage,
            endTime: new Date(),
          });
          set({ message: errorMessage });

          // Remove failed operation after a delay
          setTimeout(() => removeOperation(operationId), 10000);
        }
      },

      uninstallPackage: async (
        packageName: string,
        packageType: "formula" | "cask"
      ) => {
        const {
          addOperation,
          updateOperation,
          removeOperation,
          activeView,
          loadPackages,
        } = get();

        const operationId = addOperation({
          type: "uninstall",
          packageName,
          packageType,
          status: "pending",
        });

        try {
          updateOperation(operationId, { status: "running" });

          const result = await invoke<string>(
            packageType === "formula" ? "uninstall_package" : "uninstall_cask",
            { packageName }
          );

          updateOperation(operationId, {
            status: "completed",
            message: result,
            endTime: new Date(),
          });

          set({ message: result });

          // Refresh data if we're not in discover view
          if (activeView !== "discover") {
            await loadPackages(packageType);
          }

          // Remove completed operation after a delay
          setTimeout(() => removeOperation(operationId), 5000);
        } catch (error) {
          const errorMessage = `Error uninstalling package: ${error}`;
          updateOperation(operationId, {
            status: "failed",
            message: errorMessage,
            endTime: new Date(),
          });
          set({ message: errorMessage });

          // Remove failed operation after a delay
          setTimeout(() => removeOperation(operationId), 10000);
        }
      },

      updatePackage: async (
        packageName: string,
        packageType: "formula" | "cask"
      ) => {
        const {
          addOperation,
          updateOperation,
          removeOperation,
          activeView,
          loadPackages,
        } = get();

        const operationId = addOperation({
          type: "update",
          packageName,
          packageType,
          status: "pending",
        });

        try {
          updateOperation(operationId, { status: "running" });

          const result = await invoke<string>(
            packageType === "formula" ? "update_package" : "update_cask",
            { packageName }
          );

          updateOperation(operationId, {
            status: "completed",
            message: result,
            endTime: new Date(),
          });

          set({ message: result });

          // Refresh data if we're not in discover view
          if (activeView !== "discover") {
            await loadPackages(packageType);
          }

          // Remove completed operation after a delay
          setTimeout(() => removeOperation(operationId), 5000);
        } catch (error) {
          const errorMessage = `Error updating package: ${error}`;
          updateOperation(operationId, {
            status: "failed",
            message: errorMessage,
            endTime: new Date(),
          });
          set({ message: errorMessage });

          // Remove failed operation after a delay
          setTimeout(() => removeOperation(operationId), 10000);
        }
      },

      updateAllPackages: async (packageType: "formula" | "cask") => {
        const {
          addOperation,
          updateOperation,
          removeOperation,
          activeView,
          loadPackages,
        } = get();

        const operationId = addOperation({
          type: "update",
          packageName: `all-${packageType}`,
          packageType,
          status: "pending",
        });

        try {
          updateOperation(operationId, { status: "running" });

          const result = await invoke<string>(
            packageType === "formula"
              ? "update_all_packages"
              : "update_all_casks"
          );

          updateOperation(operationId, {
            status: "completed",
            message: result,
            endTime: new Date(),
          });

          set({ message: result });

          // Refresh data if we're not in discover view
          if (activeView !== "discover") {
            await loadPackages(packageType);
          }

          // Remove completed operation after a delay
          setTimeout(() => removeOperation(operationId), 5000);
        } catch (error) {
          const errorMessage = `Error updating all ${packageType} packages: ${error}`;
          updateOperation(operationId, {
            status: "failed",
            message: errorMessage,
            endTime: new Date(),
          });
          set({ message: errorMessage });

          // Remove failed operation after a delay
          setTimeout(() => removeOperation(operationId), 10000);
        }
      },
    }),
    {
      name: "brewdeck-store",
      version: 2, // Increment version due to breaking changes
      storage: createJSONStorage(() => localStorage),
      // Persist only what's useful across restarts
      partialize: (state) => ({
        formulae: state.formulae,
        casks: state.casks,
        cache: state.cache,
        activeView: state.activeView,
        activeTab: state.activeTab,
        selectedCategory: state.selectedCategory,
      }),
      // Reset to safe defaults on app startup
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset UI state to safe defaults
          state.activeView = "discover";
          state.activeTab = "formula";
          state.loading = {
            formulae: false,
            casks: false,
            search: false,
            operations: {},
          };
          state.operations = {};
          state.message = "";
          state.searchQuery = "";
        }
      },
    }
  )
);
