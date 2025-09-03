/**
 * Lazy loading utilities for optimizing asset loading
 */
import React from "react";

interface LazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

interface LazyComponentOptions {
  fallback?: React.ComponentType;
  delay?: number;
  retryCount?: number;
}

/**
 * Intersection Observer based lazy loading for images
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private imageMap = new WeakMap<HTMLImageElement, LazyLoadOptions>();

  constructor() {
    if (typeof window !== "undefined" && "IntersectionObserver" in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: "50px",
          threshold: 0.1,
        }
      );
    }
  }

  /**
   * Register an image for lazy loading
   */
  observe(img: HTMLImageElement, options: LazyLoadOptions = {}): void {
    if (!this.observer) {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(img, options);
      return;
    }

    this.imageMap.set(img, options);
    this.observer.observe(img);
  }

  /**
   * Unregister an image from lazy loading
   */
  unobserve(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.unobserve(img);
      this.imageMap.delete(img);
    }
  }

  /**
   * Handle intersection events
   */
  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const options = this.imageMap.get(img);

        if (options) {
          this.loadImage(img, options);
          this.unobserve(img);
        }
      }
    });
  }

  /**
   * Load an image with error handling
   */
  private loadImage(img: HTMLImageElement, options: LazyLoadOptions): void {
    const dataSrc = img.dataset.src;
    if (!dataSrc) return;

    // Create a new image to preload
    const imageLoader = new Image();

    imageLoader.onload = () => {
      img.src = dataSrc;
      img.classList.add("loaded");
      options.onLoad?.();
    };

    imageLoader.onerror = () => {
      if (options.fallbackSrc) {
        img.src = options.fallbackSrc;
      }
      img.classList.add("error");
      options.onError?.();
    };

    imageLoader.src = dataSrc;
  }

  /**
   * Cleanup observer
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.imageMap = new WeakMap();
  }
}

// Global lazy image loader instance
export const lazyImageLoader = new LazyImageLoader();

/**
 * React hook for lazy loading images
 */
export function useLazyImage(src: string, options: LazyLoadOptions = {}) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const img = imgRef.current;
    if (!img || !src) return;

    // Set data-src for lazy loading
    img.dataset.src = src;

    const loadOptions: LazyLoadOptions = {
      ...options,
      onLoad: () => {
        setIsLoaded(true);
        options.onLoad?.();
      },
      onError: () => {
        setHasError(true);
        options.onError?.();
      },
    };

    lazyImageLoader.observe(img, loadOptions);

    return () => {
      if (img) {
        lazyImageLoader.unobserve(img);
      }
    };
  }, [src, options]);

  return {
    imgRef,
    isLoaded,
    hasError,
  };
}

/**
 * Lazy loading component wrapper - moved to separate .tsx file
 * This is just the type definition
 */
export interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  placeholder?: React.ReactNode;
  [key: string]: any;
}

/**
 * Higher-order component for lazy loading React components
 */
export function withLazyLoading<T extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<T> }>,
  options: LazyComponentOptions = {}
): React.ComponentType<T> {
  const { delay = 0, retryCount = 3 } = options;

  return React.lazy(() => {
    let retries = 0;

    const loadComponent = (): Promise<{ default: React.ComponentType<T> }> => {
      return new Promise<{ default: React.ComponentType<T> }>((resolve) => {
        if (delay > 0) {
          setTimeout(() => resolve(importFunc()), delay);
        } else {
          resolve(importFunc());
        }
      }).catch((error) => {
        if (retries < retryCount) {
          retries++;
          console.warn(
            `Component loading failed, retrying (${retries}/${retryCount}):`,
            error
          );
          return new Promise<{ default: React.ComponentType<T> }>(
            (resolve, reject) => {
              setTimeout(() => {
                loadComponent().then(resolve).catch(reject);
              }, 1000 * retries);
            }
          );
        }
        throw error;
      });
    };

    return loadComponent();
  });
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources(resources: string[]): void {
  if (typeof window === "undefined") return;

  resources.forEach((resource) => {
    const link = document.createElement("link");
    link.rel = "preload";

    if (resource.endsWith(".js")) {
      link.as = "script";
    } else if (resource.endsWith(".css")) {
      link.as = "style";
    } else if (resource.match(/\.(woff2?|ttf|eot)$/)) {
      link.as = "font";
      link.crossOrigin = "anonymous";
    } else if (resource.match(/\.(jpg|jpeg|png|webp|svg)$/)) {
      link.as = "image";
    }

    link.href = resource;
    document.head.appendChild(link);
  });
}

/**
 * Prefetch non-critical resources
 */
export function prefetchResources(resources: string[]): void {
  if (typeof window === "undefined") return;

  // Use requestIdleCallback if available, otherwise setTimeout
  const scheduleWork = (callback: () => void) => {
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(callback);
    } else {
      setTimeout(callback, 0);
    }
  };

  scheduleWork(() => {
    resources.forEach((resource) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = resource;
      document.head.appendChild(link);
    });
  });
}

/**
 * Network-aware resource loading
 */
export function isSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;

  const connection = (navigator as any).connection;
  if (!connection) return false;

  // Consider connection slow if:
  // - Save data is enabled
  // - Effective type is 2g or slow-2g
  // - Downlink is less than 1.5 Mbps
  return (
    connection.saveData ||
    connection.effectiveType === "2g" ||
    connection.effectiveType === "slow-2g" ||
    connection.downlink < 1.5
  );
}

/**
 * Adaptive loading based on network conditions
 */
export function shouldLoadResource(
  priority: "high" | "medium" | "low"
): boolean {
  if (typeof navigator === "undefined") return true;

  const isSlow = isSlowConnection();

  switch (priority) {
    case "high":
      return true; // Always load high priority resources
    case "medium":
      return !isSlow; // Load medium priority only on fast connections
    case "low":
      return !isSlow && !document.hidden; // Load low priority only when visible and fast
    default:
      return true;
  }
}

/**
 * Resource loading scheduler
 */
export class ResourceScheduler {
  private queue: Array<{
    load: () => Promise<void>;
    priority: "high" | "medium" | "low";
  }> = [];

  private isProcessing = false;

  /**
   * Add resource to loading queue
   */
  schedule(
    loadFunction: () => Promise<void>,
    priority: "high" | "medium" | "low" = "medium"
  ): void {
    this.queue.push({ load: loadFunction, priority });
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.processQueue();
  }

  /**
   * Process the resource loading queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      if (shouldLoadResource(item.priority)) {
        try {
          await item.load();
        } catch (error) {
          console.warn("Resource loading failed:", error);
        }
      }

      // Yield to main thread
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    this.isProcessing = false;
  }
}

// Global resource scheduler
export const resourceScheduler = new ResourceScheduler();
