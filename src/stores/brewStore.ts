import { create } from 'zustand';
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
  searchResults: BrewPackage[];
  loading: boolean;
  message: string;
  activeTab: 'installed' | 'search' | 'discover';
  activeType: 'formula' | 'cask';
  searchQuery: string;
  
  // Cache
  lastFetch: number | null;
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
  shouldRefetch: () => boolean;
  clearCache: () => void;
}

export const useBrewStore = create<BrewStore>((set, get) => ({
  // Initial state
  brewInfo: null,
  searchResults: [],
  loading: false,
  message: '',
  activeTab: 'installed',
  activeType: 'formula',
  searchQuery: '',
  lastFetch: null,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  
  // State setters
  setActiveTab: (tab) => {
    set({ activeTab: tab });
    if (tab !== 'discover') {
      get().loadBrewInfo();
    }
  },
  
  setActiveType: (type) => {
    set({ activeType: type });
    // Clear cache when switching types to ensure fresh data
    set({ lastFetch: null });
    if (get().activeTab !== 'discover') {
      get().loadBrewInfo();
    }
  },
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setMessage: (message) => set({ message }),
  
  clearMessage: () => set({ message: '' }),
  
  // Cache management
  shouldRefetch: () => {
    const { lastFetch, cacheTimeout } = get();
    return !lastFetch || Date.now() - lastFetch > cacheTimeout;
  },
  
  clearCache: () => set({ lastFetch: null }),
  
  // Async actions
  loadBrewInfo: async () => {
    const { activeType, shouldRefetch } = get();
    
    // Check cache first
    if (!shouldRefetch()) {
      return;
    }
    
    set({ loading: true });
    
    try {
      const info = await invoke<BrewInfo>(
        activeType === 'formula' ? 'get_brew_info' : 'get_cask_info'
      );
      
      set({
        brewInfo: info,
        lastFetch: Date.now(),
        loading: false
      });
    } catch (error) {
      set({ 
        message: `Error loading brew info: ${error}`,
        loading: false 
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
    set({ loading: true });
    
    try {
      const result = await invoke<string>(
        activeType === 'formula' ? 'install_package' : 'install_cask',
        { packageName }
      );
      
      set({ message: result });
      
      // Refresh if not on discover page
      if (activeTab !== 'discover') {
        await get().loadBrewInfo();
      }
    } catch (error) {
      set({ message: `Error installing package: ${error}` });
    } finally {
      set({ loading: false });
    }
  },
  
  uninstallPackage: async (packageName: string) => {
    const { activeType, activeTab } = get();
    set({ loading: true });
    
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
      set({ loading: false });
    }
  },
  
  updatePackage: async (packageName: string) => {
    const { activeType, activeTab } = get();
    set({ loading: true });
    
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
      set({ loading: false });
    }
  },
  
  updateAllPackages: async () => {
    const { activeType, activeTab } = get();
    set({ loading: true });
    
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
      set({ loading: false });
    }
  }
}));
