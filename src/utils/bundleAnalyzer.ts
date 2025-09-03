/**
 * Bundle analysis utilities for monitoring and optimizing bundle size
 */

interface BundleInfo {
  name: string;
  size: number;
  gzipSize?: number;
  modules: string[];
  dependencies: string[];
}

interface BundleAnalysis {
  totalSize: number;
  totalGzipSize: number;
  chunks: BundleInfo[];
  largestChunks: BundleInfo[];
  duplicatedModules: string[];
  recommendations: string[];
}

class BundleAnalyzer {
  private readonly CHUNK_SIZE_LIMIT = 244 * 1024; // 244KB recommended limit
  private readonly TOTAL_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB total limit

  /**
   * Analyze bundle performance from build stats
   */
  analyzeBundleStats(stats: any): BundleAnalysis {
    const chunks: BundleInfo[] = [];
    let totalSize = 0;
    let totalGzipSize = 0;
    const moduleMap = new Map<string, number>();
    const duplicatedModules: string[] = [];

    // Process chunks from build stats
    if (stats.chunks) {
      stats.chunks.forEach((chunk: any) => {
        const chunkInfo: BundleInfo = {
          name: chunk.names?.[0] || `chunk-${chunk.id}`,
          size: chunk.size || 0,
          modules: chunk.modules?.map((m: any) => m.name || m.identifier) || [],
          dependencies: [],
        };

        chunks.push(chunkInfo);
        totalSize += chunkInfo.size;

        // Track module usage for duplication detection
        chunkInfo.modules.forEach((moduleName) => {
          const count = moduleMap.get(moduleName) || 0;
          moduleMap.set(moduleName, count + 1);

          if (count === 1) {
            // Second occurrence
            duplicatedModules.push(moduleName);
          }
        });
      });
    }

    // Sort chunks by size (largest first)
    const largestChunks = [...chunks]
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      totalSize,
      chunks,
      largestChunks,
      duplicatedModules,
    });

    return {
      totalSize,
      totalGzipSize,
      chunks,
      largestChunks,
      duplicatedModules,
      recommendations,
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(data: {
    totalSize: number;
    chunks: BundleInfo[];
    largestChunks: BundleInfo[];
    duplicatedModules: string[];
  }): string[] {
    const recommendations: string[] = [];

    // Check total bundle size
    if (data.totalSize > this.TOTAL_SIZE_LIMIT) {
      recommendations.push(
        `Total bundle size (${this.formatSize(
          data.totalSize
        )}) exceeds recommended limit (${this.formatSize(
          this.TOTAL_SIZE_LIMIT
        )}). Consider code splitting or removing unused dependencies.`
      );
    }

    // Check individual chunk sizes
    const oversizedChunks = data.chunks.filter(
      (chunk) => chunk.size > this.CHUNK_SIZE_LIMIT
    );
    if (oversizedChunks.length > 0) {
      recommendations.push(
        `${
          oversizedChunks.length
        } chunk(s) exceed recommended size limit. Consider splitting: ${oversizedChunks
          .map((c) => c.name)
          .join(", ")}`
      );
    }

    // Check for duplicated modules
    if (data.duplicatedModules.length > 0) {
      recommendations.push(
        `${
          data.duplicatedModules.length
        } modules are duplicated across chunks. Consider extracting to a shared chunk: ${data.duplicatedModules
          .slice(0, 3)
          .join(", ")}${data.duplicatedModules.length > 3 ? "..." : ""}`
      );
    }

    // Check for large vendor chunks
    const vendorChunks = data.chunks.filter(
      (chunk) =>
        chunk.name.includes("vendor") || chunk.name.includes("node_modules")
    );
    const largeVendorChunks = vendorChunks.filter(
      (chunk) => chunk.size > 500 * 1024
    );
    if (largeVendorChunks.length > 0) {
      recommendations.push(
        `Large vendor chunks detected. Consider splitting vendor dependencies into smaller chunks.`
      );
    }

    // Check for unused code opportunities
    const potentiallyUnusedModules = data.chunks
      .flatMap((chunk) => chunk.modules)
      .filter(
        (module) =>
          module.includes("node_modules") &&
          (module.includes("lodash") ||
            module.includes("moment") ||
            module.includes("rxjs"))
      );

    if (potentiallyUnusedModules.length > 0) {
      recommendations.push(
        `Potentially tree-shakeable libraries detected. Ensure you're importing only what you need from: ${[
          ...new Set(potentiallyUnusedModules.map((m) => m.split("/")[1])),
        ].join(", ")}`
      );
    }

    return recommendations;
  }

  /**
   * Format file size for display
   */
  private formatSize(bytes: number): string {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);

    return `${size.toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Analyze current runtime bundle information
   */
  analyzeRuntimeBundle(): Partial<BundleAnalysis> {
    const recommendations: string[] = [];

    // Check for large global objects
    if (typeof window !== "undefined") {
      const globalKeys = Object.keys(window).filter(
        (key) =>
          key.startsWith("__") ||
          key.includes("chunk") ||
          key.includes("webpack")
      );

      if (globalKeys.length > 10) {
        recommendations.push(
          `High number of global variables detected (${globalKeys.length}). This may indicate bundle bloat.`
        );
      }
    }

    // Check for memory usage patterns
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      const heapUsed = memory.usedJSHeapSize;
      const heapLimit = memory.jsHeapSizeLimit;

      if (heapUsed > heapLimit * 0.8) {
        recommendations.push(
          `High memory usage detected (${this.formatSize(
            heapUsed
          )}). Consider lazy loading or reducing bundle size.`
        );
      }
    }

    return { recommendations };
  }

  /**
   * Monitor bundle loading performance
   */
  monitorBundleLoading(): void {
    if (typeof window === "undefined") return;

    // Monitor script loading times
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === "resource" && entry.name.includes(".js")) {
          const resourceEntry = entry as PerformanceResourceTiming;
          const loadTime = resourceEntry.responseEnd - resourceEntry.startTime;

          if (loadTime > 1000) {
            // More than 1 second
            console.warn(
              `Slow script loading detected: ${
                entry.name
              } took ${loadTime.toFixed(0)}ms`
            );
          }
        }
      });
    });

    try {
      observer.observe({ entryTypes: ["resource"] });
    } catch (error) {
      console.warn("Resource timing not supported:", error);
    }

    // Monitor dynamic imports
    // Note: Dynamic import monitoring is disabled due to potential syntax issues
    // This would require a more sophisticated approach using module loading hooks
  }

  /**
   * Generate bundle optimization report
   */
  generateOptimizationReport(): void {
    console.group("📦 Bundle Optimization Report");

    // Runtime analysis
    const runtimeAnalysis = this.analyzeRuntimeBundle();
    if (runtimeAnalysis.recommendations?.length) {
      console.group("Runtime Recommendations:");
      runtimeAnalysis.recommendations.forEach((rec) => console.warn(rec));
      console.groupEnd();
    }

    // Performance metrics
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      console.log("Memory Usage:", {
        used: this.formatSize(memory.usedJSHeapSize),
        total: this.formatSize(memory.totalJSHeapSize),
        limit: this.formatSize(memory.jsHeapSizeLimit),
      });
    }

    // Network timing
    const navigation = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;
    if (navigation) {
      console.log("Load Timing:", {
        domContentLoaded: `${(
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart
        ).toFixed(0)}ms`,
        loadComplete: `${(
          navigation.loadEventEnd - navigation.loadEventStart
        ).toFixed(0)}ms`,
        totalTime: `${(navigation.loadEventEnd - navigation.fetchStart).toFixed(
          0
        )}ms`,
      });
    }

    console.groupEnd();
  }
}

// Create singleton instance
export const bundleAnalyzer = new BundleAnalyzer();

// Auto-start monitoring in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  bundleAnalyzer.monitorBundleLoading();

  // Generate report after initial load
  window.addEventListener("load", () => {
    setTimeout(() => {
      bundleAnalyzer.generateOptimizationReport();
    }, 1000);
  });
}

export type { BundleInfo, BundleAnalysis };
