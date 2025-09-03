import { invoke } from "@tauri-apps/api/core";
import type { EnhancedBrewPackage } from "../stores/brewStore";

export interface PrefetchRequest {
  id: string;
  packageType: "formula" | "cask";
  packages?: string[];
  priority: "high" | "medium" | "low";
  networkAware: boolean;
  createdAt: number;
}

export interface PrefetchResult {
  id: string;
  success: boolean;
  packages: EnhancedBrewPackage[];
  duration: number;
  bytesTransferred?: number;
  error?: string;
}

export interface NetworkConditions {
  type: "wifi" | "cellular" | "ethernet" | "unknown";
  quality: "excellent" | "good" | "fair" | "poor";
  bandwidth: number; // Mbps
  latency: number; // ms
  saveData: boolean;
}

export class PrefetchService {
  private requestQueue: Map<string, PrefetchRequest> = new Map();
  private activeRequests: Set<string> = new Set();
  private maxConcurrentRequests = 3;
  private networkConditions: NetworkConditions | null = null;

  constructor() {
    this.initializeNetworkMonitoring();
  }

  private initializeNetworkMonitoring() {
    // Monitor network changes
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;

      const updateNetworkConditions = () => {
        this.networkConditions = this.assessNetworkConditions();
      };

      connection.addEventListener("change", updateNetworkConditions);
      updateNetworkConditions();
    }

    // Periodic network quality assessment
    setInterval(() => {
      this.assessNetworkQuality();
    }, 30000); // Every 30 seconds
  }

  private assessNetworkConditions(): NetworkConditions {
    const connection = (navigator as any).connection;

    if (!connection) {
      return {
        type: "unknown",
        quality: "good",
        bandwidth: 10,
        latency: 100,
        saveData: false,
      };
    }

    const type = connection.type || "unknown";
    const effectiveType = connection.effectiveType || "4g";
    const downlink = connection.downlink || 10;
    const rtt = connection.rtt || 100;
    const saveData = connection.saveData || false;

    // Assess quality based on effective type and metrics
    let quality: "excellent" | "good" | "fair" | "poor";
    if (effectiveType === "4g" && downlink > 5 && rtt < 100) {
      quality = "excellent";
    } else if (
      effectiveType === "4g" ||
      (effectiveType === "3g" && downlink > 2)
    ) {
      quality = "good";
    } else if (effectiveType === "3g" || effectiveType === "slow-2g") {
      quality = "fair";
    } else {
      quality = "poor";
    }

    return {
      type: type as any,
      quality,
      bandwidth: downlink,
      latency: rtt,
      saveData,
    };
  }

  private async assessNetworkQuality(): Promise<void> {
    try {
      // Simple network quality test using a small API call
      const startTime = performance.now();
      const response = await fetch(
        "https://formulae.brew.sh/api/formula/git.json",
        {
          method: "HEAD",
          cache: "no-cache",
        }
      );
      const endTime = performance.now();

      if (response.ok) {
        const latency = endTime - startTime;

        if (this.networkConditions) {
          this.networkConditions.latency = latency;

          // Update quality based on actual performance
          if (latency < 100) {
            this.networkConditions.quality = "excellent";
          } else if (latency < 300) {
            this.networkConditions.quality = "good";
          } else if (latency < 1000) {
            this.networkConditions.quality = "fair";
          } else {
            this.networkConditions.quality = "poor";
          }
        }
      }
    } catch (error) {
      // Network test failed, assume poor quality
      if (this.networkConditions) {
        this.networkConditions.quality = "poor";
      }
    }
  }

  public shouldAllowPrefetch(
    priority: "high" | "medium" | "low" = "medium"
  ): boolean {
    if (!this.networkConditions) return false;

    // Always respect data saver
    if (this.networkConditions.saveData) return false;

    // Check if we have capacity
    if (this.activeRequests.size >= this.maxConcurrentRequests) return false;

    // Network-aware decisions
    switch (this.networkConditions.quality) {
      case "excellent":
        return true;
      case "good":
        return priority !== "low";
      case "fair":
        return priority === "high";
      case "poor":
        return false;
      default:
        return false;
    }
  }

  public async queuePrefetch(
    request: Omit<PrefetchRequest, "id" | "createdAt">
  ): Promise<string> {
    const id = `prefetch_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const fullRequest: PrefetchRequest = {
      ...request,
      id,
      createdAt: Date.now(),
    };

    this.requestQueue.set(id, fullRequest);

    // Try to process immediately if conditions allow
    if (this.shouldAllowPrefetch(request.priority)) {
      this.processNextRequest();
    }

    return id;
  }

  private async processNextRequest(): Promise<void> {
    if (this.activeRequests.size >= this.maxConcurrentRequests) return;

    // Find highest priority request that can be processed
    const sortedRequests = Array.from(this.requestQueue.values())
      .filter((req) => !this.activeRequests.has(req.id))
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    const nextRequest = sortedRequests.find(
      (req) => !req.networkAware || this.shouldAllowPrefetch(req.priority)
    );

    if (nextRequest) {
      await this.executeRequest(nextRequest);
    }
  }

  private async executeRequest(
    request: PrefetchRequest
  ): Promise<PrefetchResult> {
    this.activeRequests.add(request.id);
    const startTime = performance.now();

    try {
      let packages: EnhancedBrewPackage[];

      if (request.packages && request.packages.length > 0) {
        // Prefetch specific packages via search
        const searchQuery = request.packages.join(" ");
        packages = await invoke<EnhancedBrewPackage[]>(
          request.packageType === "formula"
            ? "search_packages"
            : "search_casks",
          { query: searchQuery }
        );
      } else {
        // Prefetch package list
        const brewInfo = await invoke<{ packages: EnhancedBrewPackage[] }>(
          request.packageType === "formula" ? "get_brew_info" : "get_cask_info"
        );
        packages = brewInfo.packages;
      }

      const duration = performance.now() - startTime;
      const result: PrefetchResult = {
        id: request.id,
        success: true,
        packages,
        duration,
      };

      this.requestQueue.delete(request.id);
      this.activeRequests.delete(request.id);

      // Process next request if any
      setTimeout(() => this.processNextRequest(), 100);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const result: PrefetchResult = {
        id: request.id,
        success: false,
        packages: [],
        duration,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      this.requestQueue.delete(request.id);
      this.activeRequests.delete(request.id);

      // Process next request if any
      setTimeout(() => this.processNextRequest(), 1000);

      return result;
    }
  }

  public async prefetchPopularPackages(
    packageType: "formula" | "cask"
  ): Promise<string> {
    return this.queuePrefetch({
      packageType,
      priority: "medium",
      networkAware: true,
    });
  }

  public async prefetchSearchResults(
    packageType: "formula" | "cask",
    packages: string[],
    priority: "high" | "medium" | "low" = "high"
  ): Promise<string> {
    return this.queuePrefetch({
      packageType,
      packages,
      priority,
      networkAware: true,
    });
  }

  public async prefetchRelatedPackages(
    packageName: string,
    packageType: "formula" | "cask"
  ): Promise<string> {
    // Get package details first to find dependencies
    try {
      const packageDetails = await invoke<EnhancedBrewPackage>(
        "get_package_details",
        {
          packageName,
          packageType,
        }
      );

      const relatedPackages = [
        ...packageDetails.dependencies.slice(0, 5),
        ...packageDetails.conflicts.slice(0, 2),
      ];

      if (relatedPackages.length > 0) {
        return this.queuePrefetch({
          packageType,
          packages: relatedPackages,
          priority: "low",
          networkAware: true,
        });
      }
    } catch (error) {
      console.warn("Failed to prefetch related packages:", error);
    }

    return "";
  }

  public cancelRequest(id: string): boolean {
    if (this.requestQueue.has(id)) {
      this.requestQueue.delete(id);
      this.activeRequests.delete(id);
      return true;
    }
    return false;
  }

  public cancelAllRequests(): void {
    this.requestQueue.clear();
    this.activeRequests.clear();
  }

  public getQueueStatus() {
    return {
      queued: this.requestQueue.size,
      active: this.activeRequests.size,
      networkConditions: this.networkConditions,
      canPrefetch: this.shouldAllowPrefetch(),
    };
  }

  public updateMaxConcurrentRequests(max: number): void {
    this.maxConcurrentRequests = Math.max(1, Math.min(10, max));
  }

  public getNetworkConditions(): NetworkConditions | null {
    return this.networkConditions;
  }
}

// Singleton instance
export const prefetchService = new PrefetchService();
