import { useCallback, useEffect, useRef, useState } from "react";
import { useBrewStore } from "../stores/brewStore";
import { usePackageCache } from "./usePackageCache";

interface NetworkInfo {
  type: "wifi" | "cellular" | "ethernet" | "unknown";
  effectiveType: "2g" | "3g" | "4g" | "slow-2g" | "unknown";
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface PrefetchConfig {
  enabled: boolean;
  maxConcurrentRequests: number;
  wifiOnly: boolean;
  respectSaveData: boolean;
  popularityThreshold: number;
  cacheWarmingEnabled: boolean;
  predictiveEnabled: boolean;
  backgroundRefreshEnabled: boolean;
}

interface UserBehaviorPattern {
  packageType: "formula" | "cask";
  searchQueries: string[];
  viewedPackages: string[];
  installedPackages: string[];
  timeOfDay: number;
  dayOfWeek: number;
  frequency: number;
}

interface PrefetchStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  bytesTransferred: number;
  cacheHitRate: number;
  averageResponseTime: number;
}

const DEFAULT_CONFIG: PrefetchConfig = {
  enabled: true,
  maxConcurrentRequests: 3,
  wifiOnly: false,
  respectSaveData: true,
  popularityThreshold: 1000,
  cacheWarmingEnabled: true,
  predictiveEnabled: true,
  backgroundRefreshEnabled: true,
};

export const usePrefetchManager = () => {
  const [config, setConfig] = useState<PrefetchConfig>(DEFAULT_CONFIG);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [userBehavior, setUserBehavior] = useState<UserBehaviorPattern[]>([]);
  const [prefetchStats, setPrefetchStats] = useState<PrefetchStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    bytesTransferred: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
  });

  const {
    loadPackages,
    searchPackages,
    getPackagesByType,
    activeTab,
    searchQuery,
  } = useBrewStore();

  const { isCacheStale, willBeStale, getCacheStats } = usePackageCache();

  const prefetchQueue = useRef<Set<string>>(new Set());
  const activeRequests = useRef<Map<string, AbortController>>(new Map());
  const behaviorHistory = useRef<Map<string, number>>(new Map());
  const lastPrefetchTime = useRef<number>(0);

  // Network detection
  const detectNetworkInfo = useCallback((): NetworkInfo => {
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!connection) {
      return {
        type: "unknown",
        effectiveType: "unknown",
        downlink: 10,
        rtt: 100,
        saveData: false,
      };
    }

    return {
      type: connection.type || "unknown",
      effectiveType: connection.effectiveType || "unknown",
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 100,
      saveData: connection.saveData || false,
    };
  }, []);

  // Check if prefetching should be allowed based on network conditions
  const shouldPrefetch = useCallback((): boolean => {
    if (!config.enabled) return false;

    const network = networkInfo || detectNetworkInfo();

    // Respect user's data saver preference
    if (config.respectSaveData && network.saveData) {
      return false;
    }

    // Check WiFi-only setting
    if (config.wifiOnly && network.type === "cellular") {
      return false;
    }

    // Check network quality
    if (network.effectiveType === "slow-2g" || network.effectiveType === "2g") {
      return false;
    }

    // Check if we're not overwhelming the network
    if (activeRequests.current.size >= config.maxConcurrentRequests) {
      return false;
    }

    return true;
  }, [config, networkInfo, detectNetworkInfo]);

  // Track user behavior patterns
  const trackUserBehavior = useCallback(
    (
      action: "search" | "view" | "install",
      packageType: "formula" | "cask",
      packageName?: string,
      query?: string
    ) => {
      const now = new Date();
      const timeOfDay = now.getHours();
      const dayOfWeek = now.getDay();

      const behaviorKey = `${action}_${packageType}_${timeOfDay}_${dayOfWeek}`;
      const currentCount = behaviorHistory.current.get(behaviorKey) || 0;
      behaviorHistory.current.set(behaviorKey, currentCount + 1);

      // Update behavior patterns
      setUserBehavior((prev) => {
        const existing = prev.find(
          (p) =>
            p.packageType === packageType &&
            p.timeOfDay === timeOfDay &&
            p.dayOfWeek === dayOfWeek
        );

        if (existing) {
          existing.frequency += 1;
          if (action === "search" && query) {
            existing.searchQueries.push(query);
          }
          if (action === "view" && packageName) {
            existing.viewedPackages.push(packageName);
          }
          if (action === "install" && packageName) {
            existing.installedPackages.push(packageName);
          }
          return [...prev];
        } else {
          const newPattern: UserBehaviorPattern = {
            packageType,
            searchQueries: action === "search" && query ? [query] : [],
            viewedPackages:
              action === "view" && packageName ? [packageName] : [],
            installedPackages:
              action === "install" && packageName ? [packageName] : [],
            timeOfDay,
            dayOfWeek,
            frequency: 1,
          };
          return [...prev, newPattern];
        }
      });
    },
    []
  );

  // Get popular packages for cache warming
  const getPopularPackages = useCallback(
    (packageType: "formula" | "cask"): string[] => {
      const packages = getPackagesByType(packageType);
      return packages
        .filter(
          (pkg) =>
            pkg.enhancedAnalytics?.downloads365d &&
            pkg.enhancedAnalytics.downloads365d > config.popularityThreshold
        )
        .sort(
          (a, b) =>
            (b.enhancedAnalytics?.downloads365d || 0) -
            (a.enhancedAnalytics?.downloads365d || 0)
        )
        .slice(0, 20)
        .map((pkg) => pkg.name);
    },
    [getPackagesByType, config.popularityThreshold]
  );

  // Predict packages user might be interested in
  const getPredictedPackages = useCallback(
    (packageType: "formula" | "cask"): string[] => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();

      // Find similar behavior patterns
      const similarPatterns = userBehavior.filter(
        (pattern) =>
          pattern.packageType === packageType &&
          Math.abs(pattern.timeOfDay - currentHour) <= 2 &&
          pattern.dayOfWeek === currentDay &&
          pattern.frequency > 1
      );

      const predictions = new Set<string>();

      similarPatterns.forEach((pattern) => {
        // Add packages from search queries
        pattern.searchQueries.forEach((query) => {
          const packages = getPackagesByType(packageType);
          const matches = packages.filter(
            (pkg) =>
              pkg.name.toLowerCase().includes(query.toLowerCase()) ||
              pkg.description.toLowerCase().includes(query.toLowerCase())
          );
          matches.slice(0, 3).forEach((pkg) => predictions.add(pkg.name));
        });

        // Add related packages to viewed/installed ones
        pattern.viewedPackages
          .concat(pattern.installedPackages)
          .forEach((pkgName) => {
            const pkg = getPackagesByType(packageType).find(
              (p) => p.name === pkgName
            );
            if (pkg?.dependencies) {
              pkg.dependencies
                .slice(0, 2)
                .forEach((dep) => predictions.add(dep));
            }
          });
      });

      return Array.from(predictions).slice(0, 10);
    },
    [userBehavior, getPackagesByType]
  );

  // Execute prefetch request
  const executePrefetch = useCallback(
    async (
      packageType: "formula" | "cask",
      packages?: string[]
    ): Promise<void> => {
      if (!shouldPrefetch()) return;

      const requestId = `${packageType}_${Date.now()}`;
      const controller = new AbortController();
      activeRequests.current.set(requestId, controller);

      try {
        const startTime = Date.now();

        if (packages && packages.length > 0) {
          // Prefetch specific packages (search results)
          await searchPackages(packages.join(" "), packageType);
        } else {
          // Prefetch package list
          await loadPackages(packageType);
        }

        const responseTime = Date.now() - startTime;

        setPrefetchStats((prev) => ({
          ...prev,
          totalRequests: prev.totalRequests + 1,
          successfulRequests: prev.successfulRequests + 1,
          averageResponseTime: (prev.averageResponseTime + responseTime) / 2,
        }));
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setPrefetchStats((prev) => ({
            ...prev,
            totalRequests: prev.totalRequests + 1,
            failedRequests: prev.failedRequests + 1,
          }));
        }
      } finally {
        activeRequests.current.delete(requestId);
      }
    },
    [shouldPrefetch, loadPackages, searchPackages]
  );

  // Cache warming strategy
  const warmCache = useCallback(async (): Promise<void> => {
    if (!config.cacheWarmingEnabled || !shouldPrefetch()) return;

    const now = Date.now();
    if (now - lastPrefetchTime.current < 30000) return; // Throttle to 30 seconds

    lastPrefetchTime.current = now;

    // Warm cache for popular packages
    const popularFormulae = getPopularPackages("formula");
    const popularCasks = getPopularPackages("cask");

    if (popularFormulae.length > 0) {
      await executePrefetch("formula", popularFormulae.slice(0, 5));
    }

    if (popularCasks.length > 0) {
      await executePrefetch("cask", popularCasks.slice(0, 5));
    }
  }, [
    config.cacheWarmingEnabled,
    shouldPrefetch,
    getPopularPackages,
    executePrefetch,
  ]);

  // Predictive prefetching
  const predictivePrefetch = useCallback(async (): Promise<void> => {
    if (!config.predictiveEnabled || !shouldPrefetch()) return;

    const predictedFormulae = getPredictedPackages("formula");
    const predictedCasks = getPredictedPackages("cask");

    if (predictedFormulae.length > 0) {
      await executePrefetch("formula", predictedFormulae.slice(0, 3));
    }

    if (predictedCasks.length > 0) {
      await executePrefetch("cask", predictedCasks.slice(0, 3));
    }
  }, [
    config.predictiveEnabled,
    shouldPrefetch,
    getPredictedPackages,
    executePrefetch,
  ]);

  // Background refresh for stale data
  const backgroundRefresh = useCallback(async (): Promise<void> => {
    if (!config.backgroundRefreshEnabled || !shouldPrefetch()) return;

    const packageTypes: ("formula" | "cask")[] = ["formula", "cask"];

    for (const packageType of packageTypes) {
      if (isCacheStale(packageType) || willBeStale(packageType, 10)) {
        await executePrefetch(packageType);
      }
    }
  }, [
    config.backgroundRefreshEnabled,
    shouldPrefetch,
    isCacheStale,
    willBeStale,
    executePrefetch,
  ]);

  // Main prefetch orchestrator
  const orchestratePrefetch = useCallback(async (): Promise<void> => {
    if (!shouldPrefetch()) return;

    // Priority 1: Background refresh of stale data
    await backgroundRefresh();

    // Priority 2: Cache warming for popular packages
    await warmCache();

    // Priority 3: Predictive prefetching
    await predictivePrefetch();
  }, [shouldPrefetch, backgroundRefresh, warmCache, predictivePrefetch]);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<PrefetchConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // Clear all active prefetch requests
  const cancelAllPrefetch = useCallback(() => {
    activeRequests.current.forEach((controller) => controller.abort());
    activeRequests.current.clear();
    prefetchQueue.current.clear();
  }, []);

  // Get prefetch recommendations
  const getPrefetchRecommendations = useCallback(() => {
    const network = networkInfo || detectNetworkInfo();
    const recommendations = [];

    if (network.saveData) {
      recommendations.push({
        type: "warning",
        message:
          "Data Saver is enabled. Prefetching is disabled to save bandwidth.",
      });
    }

    if (network.type === "cellular" && config.wifiOnly) {
      recommendations.push({
        type: "info",
        message:
          "WiFi-only prefetching is enabled. Switch to WiFi for background updates.",
      });
    }

    if (network.effectiveType === "slow-2g" || network.effectiveType === "2g") {
      recommendations.push({
        type: "warning",
        message:
          "Slow network detected. Prefetching is disabled to improve performance.",
      });
    }

    const cacheStats = getCacheStats();
    if (!cacheStats.formulae.hasData && !cacheStats.casks.hasData) {
      recommendations.push({
        type: "suggestion",
        message: "Cache is empty. Enable cache warming to improve performance.",
      });
    }

    return recommendations;
  }, [networkInfo, detectNetworkInfo, config, getCacheStats]);

  // Initialize network monitoring
  useEffect(() => {
    const updateNetworkInfo = () => {
      setNetworkInfo(detectNetworkInfo());
    };

    updateNetworkInfo();

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener("change", updateNetworkInfo);
      return () => connection.removeEventListener("change", updateNetworkInfo);
    }
  }, [detectNetworkInfo]);

  // Track user interactions
  useEffect(() => {
    if (searchQuery) {
      trackUserBehavior("search", activeTab, undefined, searchQuery);
    }
  }, [searchQuery, activeTab, trackUserBehavior]);

  // Periodic prefetch orchestration
  useEffect(() => {
    if (!config.enabled) return;

    const interval = setInterval(() => {
      orchestratePrefetch();
    }, 60000); // Run every minute

    // Initial run after a short delay
    const timeout = setTimeout(() => {
      orchestratePrefetch();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [config.enabled, orchestratePrefetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAllPrefetch();
    };
  }, [cancelAllPrefetch]);

  return {
    // Configuration
    config,
    updateConfig,

    // Network information
    networkInfo,
    shouldPrefetch: shouldPrefetch(),

    // User behavior
    userBehavior,
    trackUserBehavior,

    // Statistics
    prefetchStats,

    // Manual controls
    warmCache,
    predictivePrefetch,
    backgroundRefresh,
    orchestratePrefetch,
    cancelAllPrefetch,

    // Recommendations
    getPrefetchRecommendations,

    // Status
    isActive: activeRequests.current.size > 0,
    activeRequestCount: activeRequests.current.size,
  };
};

export default usePrefetchManager;
