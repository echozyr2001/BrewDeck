import type React from "react";

import {
  FiDownload,
  FiTrash2,
  FiRefreshCw,
  FiExternalLink,
  FiTrendingUp,
  FiAlertTriangle,
  FiInfo,
  FiPackage,
  FiHardDrive,
  FiClock,
} from "react-icons/fi";
import type { EnhancedBrewPackage } from "../stores/brewStore";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AppIcon } from "./AppIcon";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface PackageCardProps {
  pkg: EnhancedBrewPackage;
  isSearchResult?: boolean;
  activeTab?: string;
  loading?: boolean;
  onInstall?: (name: string, packageType: "formula" | "cask") => void;
  onUninstall?: (name: string, packageType: "formula" | "cask") => void;
  onUpdate?: (name: string, packageType: "formula" | "cask") => void;
  packageType?: "formula" | "cask";
}

export const PackageCard = ({
  pkg,
  isSearchResult = false,
  activeTab,
  loading = false,
  onInstall,
  onUninstall,
  onUpdate,
  packageType = "formula",
}: PackageCardProps) => {
  const handleCardClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (pkg.homepage && pkg.homepage.trim() !== "") {
      let url = pkg.homepage.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      console.log("Opening homepage:", url);
      try {
        await openUrl(url);
      } catch (error) {
        console.error("Failed to open URL with Tauri opener:", error);
        try {
          window.open(url, "_blank");
        } catch (windowError) {
          console.error("Failed to open URL with window.open:", windowError);
        }
      }
    } else {
      console.log("No homepage available for:", pkg.name);
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const hasHomepage = pkg.homepage && pkg.homepage.trim() !== "";

  // Helper functions for enhanced display
  const formatDownloads = (downloads: number) => {
    if (downloads >= 1000000) {
      return `${(downloads / 1000000).toFixed(1)}M`;
    } else if (downloads >= 1000) {
      return `${(downloads / 1000).toFixed(1)}K`;
    }
    return downloads.toString();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (date?: Date) => {
    if (!date) return null;
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      "day"
    );
  };

  const getPopularityLevel = (analytics?: { popularity: number }) => {
    if (!analytics) return null;
    if (analytics.popularity >= 80) return "high";
    if (analytics.popularity >= 40) return "medium";
    return "low";
  };

  const getWarningIcon = (type: string) => {
    switch (type) {
      case "security":
        return "🔒";
      case "compatibility":
        return "⚠️";
      case "deprecated":
        return "🚫";
      case "experimental":
        return "🧪";
      default:
        return "⚠️";
    }
  };

  const getWarningColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <TooltipProvider>
      <div
        key={pkg.name}
        className={`group relative bg-card border border-border rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:border-primary/20 ${
          hasHomepage ? "cursor-pointer" : ""
        }`}
        onClick={handleCardClick}
      >
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <AppIcon packageName={pkg.name} description={pkg.description} />
            {pkg.installed && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-chart-1 rounded-full border-2 border-background flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            )}
            {pkg.outdated && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-chart-3 rounded-full border-2 border-background animate-pulse"></div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors truncate">
                  {pkg.name}
                </h3>
                {hasHomepage && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiExternalLink
                      size={14}
                      className="text-muted-foreground"
                    />
                  </div>
                )}

                {/* Warnings */}
                {pkg.warnings && pkg.warnings.length > 0 && (
                  <div className="flex gap-1">
                    {pkg.warnings.slice(0, 2).map((warning, index) => (
                      <Tooltip key={index}>
                        <TooltipTrigger>
                          <div
                            className={`px-1.5 py-0.5 rounded text-xs border ${getWarningColor(
                              warning.severity
                            )}`}
                          >
                            {getWarningIcon(warning.type)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">
                            {warning.type.charAt(0).toUpperCase() +
                              warning.type.slice(1)}
                          </p>
                          <p className="text-sm">{warning.message}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}

                {/* Popularity indicator */}
                {pkg.enhancedAnalytics &&
                  getPopularityLevel(pkg.enhancedAnalytics) === "high" && (
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                          <FiTrendingUp size={10} />
                          Popular
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This package is highly popular in the community</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
              </div>

              <div className="flex flex-col gap-2 ml-4">
                {!pkg.installed &&
                  (isSearchResult || activeTab === "discover") && (
                    <Button
                      onClick={(e) =>
                        handleActionClick(e, () =>
                          onInstall?.(pkg.name, packageType)
                        )
                      }
                      disabled={loading}
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <FiDownload size={14} className="mr-2" />
                      Install
                    </Button>
                  )}
                {pkg.installed && (
                  <div className="flex flex-col gap-2">
                    {pkg.outdated && (
                      <Button
                        onClick={(e) =>
                          handleActionClick(e, () =>
                            onUpdate?.(pkg.name, packageType)
                          )
                        }
                        disabled={loading}
                        size="sm"
                        className="bg-chart-3 text-white hover:bg-chart-3/90"
                      >
                        <FiRefreshCw size={14} className="mr-2" />
                        Update
                      </Button>
                    )}
                    <Button
                      onClick={(e) =>
                        handleActionClick(e, () =>
                          onUninstall?.(pkg.name, packageType)
                        )
                      }
                      disabled={loading}
                      variant="outline"
                      size="sm"
                      className="border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <FiTrash2 size={14} className="mr-2" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">
              {pkg.description}
            </p>

            {/* Enhanced metadata section */}
            <div className="space-y-3">
              {/* Primary badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  v{pkg.version}
                </Badge>
                {pkg.installed && (
                  <Badge className="bg-chart-1/10 text-chart-1 hover:bg-chart-1/20">
                    Installed
                  </Badge>
                )}
                {pkg.outdated && (
                  <Badge className="bg-chart-3/10 text-chart-3 hover:bg-chart-3/20">
                    Update Available
                  </Badge>
                )}
                {pkg.category && (
                  <Badge variant="outline" className="text-xs">
                    {pkg.category}
                  </Badge>
                )}
              </div>

              {/* Analytics and metadata */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {pkg.enhancedAnalytics?.downloads365d && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1">
                        <FiTrendingUp size={12} />
                        {formatDownloads(
                          pkg.enhancedAnalytics.downloads365d
                        )}{" "}
                        downloads
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Downloads in the last 365 days</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {pkg.installSize && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1">
                        <FiHardDrive size={12} />
                        {formatFileSize(pkg.installSize)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Estimated install size</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {pkg.lastUpdated && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1">
                        <FiClock size={12} />
                        {formatDate(pkg.lastUpdated)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Last updated</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {pkg.dependencies.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1">
                        <FiPackage size={12} />
                        {pkg.dependencies.length} deps
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-medium mb-1">Dependencies:</p>
                        <p className="text-sm">
                          {pkg.dependencies.slice(0, 5).join(", ")}
                        </p>
                        {pkg.dependencies.length > 5 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            +{pkg.dependencies.length - 5} more
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}

                {pkg.conflicts.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1 text-yellow-600">
                        <FiAlertTriangle size={12} />
                        {pkg.conflicts.length} conflicts
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-medium mb-1">Conflicts with:</p>
                        <p className="text-sm">{pkg.conflicts.join(", ")}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Caveats */}
              {pkg.caveats && pkg.caveats.trim() && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      <FiInfo size={12} className="mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">
                        Important installation notes available
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    <div>
                      <p className="font-medium mb-1">Installation Notes:</p>
                      <p className="text-sm whitespace-pre-wrap">
                        {pkg.caveats}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
