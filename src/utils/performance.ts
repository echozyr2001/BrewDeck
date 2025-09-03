/**
 * Performance monitoring utilities for BrewDeck
 */
import React from "react";

interface PerformanceMetrics {
  loadTime: number;
  searchResponseTime: number;
  installationTime: number;
  cacheHitRate: number;
  errorRate: number;
  memoryUsage?: number;
  bundleSize?: number;
}

interface PerformanceBudget {
  maxLoadTime: number; // milliseconds
  maxSearchTime: number; // milliseconds
  maxInstallTime: number; // milliseconds
  minCacheHitRate: number; // percentage
  maxErrorRate: number; // percentage
  maxBundleSize: number; // bytes
  maxMemoryUsage: number; // MB
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private budget: PerformanceBudget = {
    maxLoadTime: 3000, // 3 seconds
    maxSearchTime: 500, // 500ms
    maxInstallTime: 30000, // 30 seconds
    minCacheHitRate: 80, // 80%
    maxErrorRate: 5, // 5%
    maxBundleSize: 2 * 1024 * 1024, // 2MB
    maxMemoryUsage: 100, // 100MB
  };

  private timers: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  startTimer(operation: string): void {
    this.timers.set(operation, performance.now());
  }

  /**
   * End timing an operation and record the duration
   */
  endTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      console.warn(`Timer for operation "${operation}" was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(operation);

    // Record specific metrics
    switch (operation) {
      case "app-load":
        this.metrics.loadTime = duration;
        break;
      case "search":
        this.metrics.searchResponseTime = duration;
        break;
      case "install":
      case "uninstall":
      case "update":
        this.metrics.installationTime = duration;
        break;
    }

    return duration;
  }

  /**
   * Increment a counter
   */
  incrementCounter(counter: string): void {
    const current = this.counters.get(counter) || 0;
    this.counters.set(counter, current + 1);
  }

  /**
   * Get counter value
   */
  getCounter(counter: string): number {
    return this.counters.get(counter) || 0;
  }

  /**
   * Calculate cache hit rate
   */
  calculateCacheHitRate(): number {
    const hits = this.getCounter("cache-hit");
    const misses = this.getCounter("cache-miss");
    const total = hits + misses;

    if (total === 0) return 0;

    const hitRate = (hits / total) * 100;
    this.metrics.cacheHitRate = hitRate;
    return hitRate;
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(): number {
    const errors = this.getCounter("error");
    const total = this.getCounter("operation");

    if (total === 0) return 0;

    const errorRate = (errors / total) * 100;
    this.metrics.errorRate = errorRate;
    return errorRate;
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): number | undefined {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      this.metrics.memoryUsage = usedMB;
      return usedMB;
    }
    return undefined;
  }

  /**
   * Check if performance meets budget requirements
   */
  checkBudget(): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    if (
      this.metrics.loadTime &&
      this.metrics.loadTime > this.budget.maxLoadTime
    ) {
      violations.push(
        `Load time (${this.metrics.loadTime.toFixed(0)}ms) exceeds budget (${
          this.budget.maxLoadTime
        }ms)`
      );
    }

    if (
      this.metrics.searchResponseTime &&
      this.metrics.searchResponseTime > this.budget.maxSearchTime
    ) {
      violations.push(
        `Search time (${this.metrics.searchResponseTime.toFixed(
          0
        )}ms) exceeds budget (${this.budget.maxSearchTime}ms)`
      );
    }

    if (
      this.metrics.installationTime &&
      this.metrics.installationTime > this.budget.maxInstallTime
    ) {
      violations.push(
        `Installation time (${this.metrics.installationTime.toFixed(
          0
        )}ms) exceeds budget (${this.budget.maxInstallTime}ms)`
      );
    }

    if (
      this.metrics.cacheHitRate !== undefined &&
      this.metrics.cacheHitRate < this.budget.minCacheHitRate
    ) {
      violations.push(
        `Cache hit rate (${this.metrics.cacheHitRate.toFixed(
          1
        )}%) below budget (${this.budget.minCacheHitRate}%)`
      );
    }

    if (
      this.metrics.errorRate !== undefined &&
      this.metrics.errorRate > this.budget.maxErrorRate
    ) {
      violations.push(
        `Error rate (${this.metrics.errorRate.toFixed(1)}%) exceeds budget (${
          this.budget.maxErrorRate
        }%)`
      );
    }

    if (
      this.metrics.memoryUsage &&
      this.metrics.memoryUsage > this.budget.maxMemoryUsage
    ) {
      violations.push(
        `Memory usage (${this.metrics.memoryUsage.toFixed(
          1
        )}MB) exceeds budget (${this.budget.maxMemoryUsage}MB)`
      );
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    // Update calculated metrics
    this.calculateCacheHitRate();
    this.calculateErrorRate();
    this.getMemoryUsage();

    return {
      loadTime: this.metrics.loadTime || 0,
      searchResponseTime: this.metrics.searchResponseTime || 0,
      installationTime: this.metrics.installationTime || 0,
      cacheHitRate: this.metrics.cacheHitRate || 0,
      errorRate: this.metrics.errorRate || 0,
      memoryUsage: this.metrics.memoryUsage,
      bundleSize: this.metrics.bundleSize,
    };
  }

  /**
   * Update performance budget
   */
  updateBudget(newBudget: Partial<PerformanceBudget>): void {
    this.budget = { ...this.budget, ...newBudget };
  }

  /**
   * Reset all metrics and counters
   */
  reset(): void {
    this.metrics = {};
    this.timers.clear();
    this.counters.clear();
  }

  /**
   * Log performance report
   */
  logReport(): void {
    const metrics = this.getMetrics();
    const budgetCheck = this.checkBudget();

    console.group("📊 Performance Report");
    console.log("Metrics:", metrics);
    console.log(
      "Budget Status:",
      budgetCheck.passed ? "✅ PASSED" : "❌ FAILED"
    );

    if (budgetCheck.violations.length > 0) {
      console.group("Budget Violations:");
      budgetCheck.violations.forEach((violation) => console.warn(violation));
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Monitor Core Web Vitals
   */
  monitorWebVitals(): void {
    // Largest Contentful Paint (LCP)
    if ("PerformanceObserver" in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log("LCP:", lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            console.log(
              "FID:",
              (entry as any).processingStart - entry.startTime
            );
          });
        });
        fidObserver.observe({ entryTypes: ["first-input"] });

        // Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });
          console.log("CLS:", clsValue);
        });
        clsObserver.observe({ entryTypes: ["layout-shift"] });
      } catch (error) {
        console.warn("Performance Observer not fully supported:", error);
      }
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring when module loads
if (typeof window !== "undefined") {
  // Expose performance monitor globally for store access
  (window as any).performanceMonitor = performanceMonitor;

  performanceMonitor.monitorWebVitals();

  // Monitor app load time
  performanceMonitor.startTimer("app-load");

  // End load timer when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      performanceMonitor.endTimer("app-load");
    });
  } else {
    // DOM already loaded
    performanceMonitor.endTimer("app-load");
  }
}

/**
 * Higher-order component for monitoring component performance
 */
export function withPerformanceMonitoring<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
): React.ComponentType<T> {
  return function PerformanceMonitoredComponent(props: T) {
    React.useEffect(() => {
      performanceMonitor.startTimer(`component-${componentName}`);
      return () => {
        performanceMonitor.endTimer(`component-${componentName}`);
      };
    }, []);

    return React.createElement(Component, props);
  };
}

/**
 * Hook for monitoring operation performance
 */
export function usePerformanceMonitoring() {
  const startOperation = React.useCallback((operation: string) => {
    performanceMonitor.incrementCounter("operation");
    performanceMonitor.startTimer(operation);
  }, []);

  const endOperation = React.useCallback(
    (operation: string, success: boolean = true) => {
      const duration = performanceMonitor.endTimer(operation);
      if (!success) {
        performanceMonitor.incrementCounter("error");
      }
      return duration;
    },
    []
  );

  const recordCacheHit = React.useCallback(() => {
    performanceMonitor.incrementCounter("cache-hit");
  }, []);

  const recordCacheMiss = React.useCallback(() => {
    performanceMonitor.incrementCounter("cache-miss");
  }, []);

  const getMetrics = React.useCallback(() => {
    return performanceMonitor.getMetrics();
  }, []);

  const checkBudget = React.useCallback(() => {
    return performanceMonitor.checkBudget();
  }, []);

  const logReport = React.useCallback(() => {
    return performanceMonitor.logReport();
  }, []);

  return {
    startOperation,
    endOperation,
    recordCacheHit,
    recordCacheMiss,
    getMetrics,
    checkBudget,
    logReport,
  };
}

export type { PerformanceMetrics, PerformanceBudget };
