import { useCallback, useMemo } from 'react';
import { useBrewStore } from '../stores/brewStore';
import type { CacheState } from '../stores/brewStore';

/**
 * Custom hook for cache management
 * Provides utilities for managing package data cache
 */
export const usePackageCache = () => {
  const {
    cache,
    shouldRefetch,
    clearCache,
    loadPackages,
  } = useBrewStore();

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const formulaeStats = {
      hasData: !!cache.formulae.data,
      lastFetch: cache.formulae.lastFetch,
      packageCount: cache.formulae.data?.packages.length || 0,
      searchResultsCount: cache.formulae.searchResults.length,
      isStale: shouldRefetch('formula'),
    };

    const casksStats = {
      hasData: !!cache.casks.data,
      lastFetch: cache.casks.lastFetch,
      packageCount: cache.casks.data?.packages.length || 0,
      searchResultsCount: cache.casks.searchResults.length,
      isStale: shouldRefetch('cask'),
    };

    return {
      formulae: formulaeStats,
      casks: casksStats,
      timeout: cache.timeout,
      totalPackages: formulaeStats.packageCount + casksStats.packageCount,
    };
  }, [cache, shouldRefetch]);

  // Check if cache is warm (has data for both types)
  const isCacheWarm = useMemo(() => {
    return !!(cache.formulae.data && cache.casks.data);
  }, [cache.formulae.data, cache.casks.data]);

  // Check if cache is stale for a specific type
  const isCacheStale = useCallback(
    (packageType: 'formula' | 'cask') => {
      return shouldRefetch(packageType);
    },
    [shouldRefetch]
  );

  // Get cache age in minutes
  const getCacheAge = useCallback(
    (packageType: 'formula' | 'cask'): number | null => {
      const cacheKey = packageType === 'formula' ? 'formulae' : 'casks';
      const lastFetch = cache[cacheKey].lastFetch;
      if (!lastFetch) return null;
      
      return Math.floor((Date.now() - lastFetch) / (1000 * 60));
    },
    [cache]
  );

  // Refresh cache for a specific type
  const refreshCache = useCallback(
    async (packageType: 'formula' | 'cask') => {
      clearCache(packageType);
      await loadPackages(packageType);
    },
    [clearCache, loadPackages]
  );

  // Refresh all cache
  const refreshAllCache = useCallback(async () => {
    clearCache();
    await Promise.all([
      loadPackages('formula'),
      loadPackages('cask'),
    ]);
  }, [clearCache, loadPackages]);

  // Warm up cache (preload both types)
  const warmUpCache = useCallback(async () => {
    const promises: Promise<void>[] = [];
    
    if (shouldRefetch('formula')) {
      promises.push(loadPackages('formula'));
    }
    
    if (shouldRefetch('cask')) {
      promises.push(loadPackages('cask'));
    }
    
    await Promise.all(promises);
  }, [shouldRefetch, loadPackages]);

  // Get cache efficiency metrics
  const getCacheEfficiency = useCallback(() => {
    const stats = getCacheStats();
    const totalRequests = stats.formulae.packageCount + stats.casks.packageCount;
    const cacheHits = (stats.formulae.hasData ? 1 : 0) + (stats.casks.hasData ? 1 : 0);
    const hitRate = totalRequests > 0 ? (cacheHits / 2) * 100 : 0;
    
    return {
      hitRate,
      totalPackagesCached: totalRequests,
      formulaeHit: stats.formulae.hasData,
      casksHit: stats.casks.hasData,
      averageAge: [
        getCacheAge('formula'),
        getCacheAge('cask'),
      ].filter(age => age !== null).reduce((sum, age) => sum + age!, 0) / 2 || 0,
    };
  }, [getCacheStats, getCacheAge]);

  // Predict if cache will be stale soon (within next 5 minutes)
  const willBeStale = useCallback(
    (packageType: 'formula' | 'cask', withinMinutes: number = 5): boolean => {
      const cacheKey = packageType === 'formula' ? 'formulae' : 'casks';
      const lastFetch = cache[cacheKey].lastFetch;
      if (!lastFetch) return true;
      
      const timeUntilStale = cache.timeout - (Date.now() - lastFetch);
      return timeUntilStale <= (withinMinutes * 60 * 1000);
    },
    [cache]
  );

  // Get cache memory usage estimate (rough calculation)
  const getCacheMemoryUsage = useCallback(() => {
    const formulaeSize = cache.formulae.data ? 
      JSON.stringify(cache.formulae.data).length : 0;
    const casksSize = cache.casks.data ? 
      JSON.stringify(cache.casks.data).length : 0;
    const searchResultsSize = 
      JSON.stringify(cache.formulae.searchResults).length +
      JSON.stringify(cache.casks.searchResults).length;
    
    const totalBytes = formulaeSize + casksSize + searchResultsSize;
    const totalKB = Math.round(totalBytes / 1024);
    const totalMB = Math.round(totalKB / 1024 * 100) / 100;
    
    return {
      bytes: totalBytes,
      kb: totalKB,
      mb: totalMB,
      breakdown: {
        formulae: Math.round(formulaeSize / 1024),
        casks: Math.round(casksSize / 1024),
        searchResults: Math.round(searchResultsSize / 1024),
      },
    };
  }, [cache]);

  return {
    // Cache state
    cache,
    isCacheWarm,
    
    // Cache status checks
    isCacheStale,
    getCacheAge,
    willBeStale,
    
    // Cache operations
    refreshCache,
    refreshAllCache,
    warmUpCache,
    clearCache,
    
    // Cache analytics
    getCacheStats,
    getCacheEfficiency,
    getCacheMemoryUsage,
  };
};

export default usePackageCache;