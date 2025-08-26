import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface BrewPackage {
  name: string;
  version: string;
  description: string;
  installed: boolean;
  outdated: boolean;
}

export interface BrewInfo {
  packages: BrewPackage[];
  total_installed: number;
  total_outdated: number;
}

interface BrewStore {
  // State
  brewInfo: BrewInfo | null;
  // Per-type caches so switches are instant
  brewInfoByType: Record<'formula' | 'cask', BrewInfo | null>;
  lastFetchByType: Record<'formula' | 'cask', number | null>;
  isRefreshing: boolean;

  searchResults: BrewPackage[];
  loading: boolean; // cold load only
  message: string;
  activeTab: 'installed' | 'search' | 'discover';
  activeType: 'formula' | 'cask';
  searchQuery: string;
  
  // Cache
  cacheTimeout: number; // 5 minutes
  
  // Actions
  setActiveTab: (tab: 'installed' | 'search' | 'discover') => void;
  setActiveType: (type: 'formula' | 'cask') => void;
  setSearchQuery: (query: string) => void;
  setMessage: (message: string) => void;
  clearMessage: () => void;
  
  // Async actions
  loadBrewInfo: () => Promise<void>;
  searchPackages: (query: string) => Promise<void>;
  installPackage: (packageName: string) => Promise<void>;
  uninstallPackage: (packageName: string) => Promise<void>;
  updatePackage: (packageName: string) => Promise<void>;
  updateAllPackages: () => Promise<void>;
  
  // Cache management
  shouldRefetch: (type: 'formula' | 'cask') => boolean;
  clearCache: (type?: 'formula' | 'cask') => void;
}

export const useBrewStore = create<BrewStore>()(
  persist(
    (set, get) => ({
      // Initial state
      brewInfo: null,
      brewInfoByType: { formula: null, cask: null },
      lastFetchByType: { formula: null, cask: null },
      isRefreshing: false,

      searchResults: [],
      loading: false,
      message: '',
      activeTab: 'installed',
      activeType: 'formula',
      searchQuery: '',
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      
      // State setters
      setActiveTab: (tab) => {
        set({ activeTab: tab });
        if (tab !== 'discover') {
          get().loadBrewInfo();
        }
      },
      
      setActiveType: (type) => {
        // Switch type and immediately expose cached data if present
        const { brewInfoByType } = get();
        set({ activeType: type, brewInfo: brewInfoByType[type] });
        if (get().activeTab !== 'discover') {
          get().loadBrewInfo();
        }
      },
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setMessage: (message) => set({ message }),
      
      clearMessage: () => set({ message: '' }),
      
      // Cache management
      shouldRefetch: (type) => {
        const { lastFetchByType, cacheTimeout } = get();
        const ts = lastFetchByType[type];
        return !ts || Date.now() - ts > cacheTimeout;
      },
      
      clearCache: (type) => {
        if (!type) {
          set({ lastFetchByType: { formula: null, cask: null } });
        } else {
          set((s) => ({ lastFetchByType: { ...s.lastFetchByType, [type]: null } }));
        }
      },
      
      // Async actions
      loadBrewInfo: async () => {
        const { activeType, brewInfoByType, shouldRefetch } = get();
        const cached = brewInfoByType[activeType];

        // If we have cached data (even from disk), expose it immediately
        if (cached) {
          set({ brewInfo: cached });
        }

        const needsRefetch = shouldRefetch(activeType);

        // Decide user-visible loading vs background refresh
        if (!cached) {
          set({ loading: true });
        } else if (needsRefetch) {
          set({ isRefreshing: true });
        } else {
          // Fresh cache, nothing to do
          return;
        }

        try {
          const info = await invoke<BrewInfo>(
            activeType === 'formula' ? 'get_brew_info' : 'get_cask_info'
          );
          set((s) => ({
            brewInfo: info,
            brewInfoByType: { ...s.brewInfoByType, [activeType]: info },
            lastFetchByType: { ...s.lastFetchByType, [activeType]: Date.now() },
            loading: false,
            isRefreshing: false
          }));

          // Prefetch the other type in background if not cached yet
          const other: 'formula' | 'cask' = activeType === 'formula' ? 'cask' : 'formula';
          const hasOther = get().brewInfoByType[other];
          if (!hasOther) {
            (async () => {
              try {
                const otherInfo = await invoke<BrewInfo>(
                  other === 'formula' ? 'get_brew_info' : 'get_cask_info'
                );
                set((s2) => ({
                  brewInfoByType: { ...s2.brewInfoByType, [other]: otherInfo },
                  lastFetchByType: { ...s2.lastFetchByType, [other]: Date.now() }
                }));
              } catch {
                // silent prefetch failure
              }
            })();
          }
        } catch (error) {
          set({ 
            message: `Error loading brew info: ${error}`,
            loading: false,
            isRefreshing: false
          });
        }
      },
      
      searchPackages: async (query: string) => {
        if (!query.trim()) {
          set({ searchResults: [] });
          return;
        }
        
        const { activeType } = get();
        set({ loading: true });
        
        try {
          const results = await invoke<BrewPackage[]>(
            activeType === 'formula' ? 'search_packages' : 'search_casks',
            { query }
          );
          
          set({ searchResults: results, loading: false });
        } catch (error) {
          set({ 
            message: `Error searching packages: ${error}`,
            loading: false 
          });
        }
      },
      
      installPackage: async (packageName: string) => {
        const { activeType, activeTab } = get();
        set({ isRefreshing: true });
        
        try {
          const result = await invoke<string>(
            activeType === 'formula' ? 'install_package' : 'install_cask',
            { packageName }
          );
          
          set({ message: result });
          
          if (activeTab !== 'discover') {
            await get().loadBrewInfo();
          }
        } catch (error) {
          set({ message: `Error installing package: ${error}` });
        } finally {
          set({ isRefreshing: false });
        }
      },
      
      uninstallPackage: async (packageName: string) => {
        const { activeType, activeTab } = get();
        set({ isRefreshing: true });
        
        try {
          const result = await invoke<string>(
            activeType === 'formula' ? 'uninstall_package' : 'uninstall_cask',
            { packageName }
          );
          
          set({ message: result });
          
          if (activeTab !== 'discover') {
            await get().loadBrewInfo();
          }
        } catch (error) {
          set({ message: `Error uninstalling package: ${error}` });
        } finally {
          set({ isRefreshing: false });
        }
      },
      
      updatePackage: async (packageName: string) => {
        const { activeType, activeTab } = get();
        set({ isRefreshing: true });
        
        try {
          const result = await invoke<string>(
            activeType === 'formula' ? 'update_package' : 'update_cask',
            { packageName }
          );
          
          set({ message: result });
          
          if (activeTab !== 'discover') {
            await get().loadBrewInfo();
          }
        } catch (error) {
          set({ message: `Error updating package: ${error}` });
        } finally {
          set({ isRefreshing: false });
        }
      },
      
      updateAllPackages: async () => {
        const { activeType, activeTab } = get();
        set({ isRefreshing: true });
        
        try {
          const result = await invoke<string>(
            activeType === 'formula' ? 'update_all_packages' : 'update_all_casks'
          );
          
          set({ message: result });
          
          if (activeTab !== 'discover') {
            await get().loadBrewInfo();
          }
        } catch (error) {
          set({ message: `Error updating all packages: ${error}` });
        } finally {
          set({ isRefreshing: false });
        }
      }
    }),
    {
      name: 'brewdeck-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist only what’s useful across restarts
      partialize: (state) => ({
        brewInfoByType: state.brewInfoByType,
        lastFetchByType: state.lastFetchByType,
        activeType: state.activeType,
        cacheTimeout: state.cacheTimeout,
      }),
      // Reset activeType on app startup
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.activeType = 'formula';
        }
      },
    }
  )
);
