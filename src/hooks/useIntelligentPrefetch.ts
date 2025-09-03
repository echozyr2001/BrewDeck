import { useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useBrewStore } from "../stores/brewStore";
import { usePrefetchManager } from "./usePrefetchManager";

interface PrefetchStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  bytesTransferred: number;
  averageResponseTimeMs: number;
  cacheHitRate: number;
}

export const useIntelligentPrefetch = () => {
  const { config, updateConfig, networkInfo, trackUserBehavior, userBehavior } =
    usePrefetchManager();

  const { activeView, activeTab, searchQuery } = useBrewStore();

  const lastSearchQuery = useRef<string>("");
  const viewStartTime = useRef<number>(Date.now());
  const packageViewHistory = useRef<Map<string, number>>(new Map());

  // Sync network conditions with backend
  const syncNetworkConditions = useCallback(async () => {
    if (!networkInfo) return;

    try {
      await invoke("update_network_conditions", {
        conditions: {
          connectionType: networkInfo.type,
          effectiveType: networkInfo.effectiveType,
          downlink: networkInfo.downlink,
          rtt: networkInfo.rtt,
          saveData: networkInfo.saveData,
        },
      });
    } catch (error) {
      console.warn("Failed to sync network conditions:", error);
    }
  }, [networkInfo]);

  // Sync prefetch configuration with backend
  const syncPrefetchConfig = useCallback(async () => {
    try {
      await invoke("update_prefetch_config", {
        config: {
          enabled: config.enabled,
          maxConcurrentRequests: config.maxConcurrentRequests,
          wifiOnly: config.wifiOnly,
          respectSaveData: config.respectSaveData,
          popularityThreshold: config.popularityThreshold,
          cacheWarmingEnabled: config.cacheWarmingEnabled,
          predictiveEnabled: config.predictiveEnabled,
          backgroundRefreshEnabled: config.backgroundRefreshEnabled,
          prefetchIntervalSeconds: 300,
        },
      });
    } catch (error) {
      console.warn("Failed to sync prefetch config:", error);
    }
  }, [config]);

  // Get prefetch statistics from backend
  const getPrefetchStats =
    useCallback(async (): Promise<PrefetchStats | null> => {
      try {
        return await invoke<PrefetchStats>("get_prefetch_stats");
      } catch (error) {
        console.warn("Failed to get prefetch stats:", error);
        return null;
      }
    }, []);

  // Trigger popular packages prefetch
  const prefetchPopularPackages = useCallback(
    async (packageType: "formula" | "cask") => {
      try {
        await invoke("prefetch_popular_packages", { packageType });
      } catch (error) {
        console.warn("Failed to prefetch popular packages:", error);
      }
    },
    []
  );

  // Trigger related packages prefetch
  const prefetchRelatedPackages = useCallback(
    async (packageName: string, packageType: "formula" | "cask") => {
      try {
        await invoke("prefetch_related_packages", { packageName, packageType });
      } catch (error) {
        console.warn("Failed to prefetch related packages:", error);
      }
    },
    []
  );

  // Trigger predictive prefetch based on user behavior
  const triggerPredictivePrefetch = useCallback(async () => {
    if (!config.predictiveEnabled) return;

    // Extract search patterns from user behavior
    const searchPatterns = userBehavior
      .flatMap((pattern) => pattern.searchQueries)
      .filter((query, index, arr) => arr.indexOf(query) === index) // Remove duplicates
      .slice(0, 10); // Limit to top 10 patterns

    if (searchPatterns.length > 0) {
      try {
        await invoke("predictive_prefetch", { userPatterns: searchPatterns });
      } catch (error) {
        console.warn("Failed to trigger predictive prefetch:", error);
      }
    }
  }, [config.predictiveEnabled, userBehavior]);

  // Track package view for prefetching related packages
  const trackPackageView = useCallback(
    (packageName: string, packageType: "formula" | "cask") => {
      const viewCount = packageViewHistory.current.get(packageName) || 0;
      packageViewHistory.current.set(packageName, viewCount + 1);

      // Track user behavior
      trackUserBehavior("view", packageType, packageName);

      // Prefetch related packages if this is a frequently viewed package
      if (viewCount >= 2) {
        prefetchRelatedPackages(packageName, packageType);
      }
    },
    [trackUserBehavior, prefetchRelatedPackages]
  );

  // Track search behavior and trigger predictive prefetch
  const trackSearchBehavior = useCallback(
    (query: string, packageType: "formula" | "cask") => {
      if (query !== lastSearchQuery.current) {
        lastSearchQuery.current = query;
        trackUserBehavior("search", packageType, undefined, query);

        // Trigger predictive prefetch after a delay
        setTimeout(() => {
          triggerPredictivePrefetch();
        }, 5000);
      }
    },
    [trackUserBehavior, triggerPredictivePrefetch]
  );

  // Track view changes for cache warming
  const trackViewChange = useCallback(
    (_: string, tab: "formula" | "cask") => {
      const now = Date.now();
      const timeInView = now - viewStartTime.current;
      viewStartTime.current = now;

      // If user spent significant time in a view, warm cache for that type
      if (timeInView > 30000 && config.cacheWarmingEnabled) {
        // 30 seconds
        prefetchPopularPackages(tab);
      }
    },
    [config.cacheWarmingEnabled, prefetchPopularPackages]
  );

  // Smart prefetch based on current context
  const smartPrefetch = useCallback(async () => {
    if (!config.enabled) return;

    const currentTime = new Date();
    const hour = currentTime.getHours();
    const dayOfWeek = currentTime.getDay();

    // Find similar usage patterns
    const similarPatterns = userBehavior.filter(
      (pattern) =>
        Math.abs(pattern.timeOfDay - hour) <= 1 &&
        pattern.dayOfWeek === dayOfWeek &&
        pattern.frequency > 1
    );

    // Prefetch based on historical patterns
    for (const pattern of similarPatterns.slice(0, 3)) {
      if (pattern.searchQueries.length > 0) {
        // Prefetch search results for common queries
        const topQuery = pattern.searchQueries[0];
        trackSearchBehavior(topQuery, pattern.packageType);
      }

      if (pattern.viewedPackages.length > 0) {
        // Prefetch details for commonly viewed packages
        const topPackage = pattern.viewedPackages[0];
        prefetchRelatedPackages(topPackage, pattern.packageType);
      }
    }
  }, [
    config.enabled,
    userBehavior,
    trackSearchBehavior,
    prefetchRelatedPackages,
  ]);

  // Adaptive prefetch based on network conditions
  const adaptivePrefetch = useCallback(async () => {
    if (!networkInfo || !config.enabled) return;

    // Adjust prefetch behavior based on network quality
    if (networkInfo.effectiveType === "4g" && !networkInfo.saveData) {
      // Aggressive prefetching on good network
      await prefetchPopularPackages(activeTab);
      await triggerPredictivePrefetch();
    } else if (networkInfo.effectiveType === "3g") {
      // Moderate prefetching on medium network
      if (Math.random() > 0.5) {
        // 50% chance
        await prefetchPopularPackages(activeTab);
      }
    }
    // Conservative or no prefetching on slow networks
  }, [
    networkInfo,
    config.enabled,
    activeTab,
    prefetchPopularPackages,
    triggerPredictivePrefetch,
  ]);

  // Sync network conditions when they change
  useEffect(() => {
    syncNetworkConditions();
  }, [syncNetworkConditions]);

  // Sync configuration when it changes
  useEffect(() => {
    syncPrefetchConfig();
  }, [syncPrefetchConfig]);

  // Track search queries
  useEffect(() => {
    if (searchQuery) {
      trackSearchBehavior(searchQuery, activeTab);
    }
  }, [searchQuery, activeTab, trackSearchBehavior]);

  // Track view changes
  useEffect(() => {
    trackViewChange(activeView, activeTab);
  }, [activeView, activeTab, trackViewChange]);

  // Periodic smart prefetch
  useEffect(() => {
    if (!config.enabled) return;

    const interval = setInterval(() => {
      smartPrefetch();
      adaptivePrefetch();
    }, 120000); // Every 2 minutes

    // Initial smart prefetch after a delay
    const timeout = setTimeout(() => {
      smartPrefetch();
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [config.enabled, smartPrefetch, adaptivePrefetch]);

  return {
    // Configuration
    config,
    updateConfig,

    // Network information
    networkInfo,

    // Manual controls
    prefetchPopularPackages,
    prefetchRelatedPackages,
    triggerPredictivePrefetch,

    // Tracking
    trackPackageView,
    trackSearchBehavior,

    // Statistics
    getPrefetchStats,

    // Smart prefetch
    smartPrefetch,
    adaptivePrefetch,
  };
};

export default useIntelligentPrefetch;
