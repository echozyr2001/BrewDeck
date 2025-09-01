import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import {
  FiDownload,
  FiTrash2,
  FiRefreshCw,
  FiExternalLink,
  FiPackage,
  FiAlertTriangle,
  FiInfo,
  FiTrendingUp,
  FiHardDrive,
  FiClock,
  FiGitBranch,
  FiUsers,
  FiStar,
  FiCalendar,
} from "react-icons/fi";
import type { EnhancedBrewPackage } from "../stores/brewStore";
import { AppIcon } from "./AppIcon";
import { openUrl } from "@tauri-apps/plugin-opener";

interface PackageDetailsModalProps {
  pkg: EnhancedBrewPackage | null;
  isOpen: boolean;
  onClose: () => void;
  onInstall?: (name: string, packageType: "formula" | "cask") => void;
  onUninstall?: (name: string, packageType: "formula" | "cask") => void;
  onUpdate?: (name: string, packageType: "formula" | "cask") => void;
  packageType?: "formula" | "cask";
  loading?: boolean;
}

export const PackageDetailsModal = ({
  pkg,
  isOpen,
  onClose,
  onInstall,
  onUninstall,
  onUpdate,
  packageType = "formula",
  loading = false,
}: PackageDetailsModalProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!pkg) return null;
  const handleOpenHomepage = async () => {
    if (pkg.homepage && pkg.homepage.trim() !== "") {
      let url = pkg.homepage.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      try {
        await openUrl(url);
      } catch (error) {
        console.error("Failed to open URL:", error);
      }
    }
  };

  const formatDownloads = (downloads: number) => {
    if (downloads >= 1000000) {
      return `${(downloads / 1000000).toFixed(1)}M`;
    } else if (downloads >= 1000) {
      return `${(downloads / 1000).toFixed(1)}K`;
    }
    return downloads.toString();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (date?: Date) => {
    if (!date) return "Unknown";
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start gap-4">
            <div className="relative">
              <AppIcon
                packageName={pkg.name}
                description={pkg.description}
                size="lg"
              />
              {pkg.installed && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold mb-2">
                    {pkg.name}
                  </DialogTitle>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    {pkg.description}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  {pkg.homepage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenHomepage}
                    >
                      <FiExternalLink className="w-4 h-4 mr-2" />
                      Homepage
                    </Button>
                  )}

                  {!pkg.installed && (
                    <Button
                      onClick={() => onInstall?.(pkg.name, packageType)}
                      disabled={loading}
                      className="bg-primary text-primary-foreground"
                    >
                      <FiDownload className="w-4 h-4 mr-2" />
                      Install
                    </Button>
                  )}

                  {pkg.installed && (
                    <div className="flex gap-2">
                      {pkg.outdated && (
                        <Button
                          onClick={() => onUpdate?.(pkg.name, packageType)}
                          disabled={loading}
                          className="bg-orange-500 text-white hover:bg-orange-600"
                        >
                          <FiRefreshCw className="w-4 h-4 mr-2" />
                          Update
                        </Button>
                      )}
                      <Button
                        onClick={() => onUninstall?.(pkg.name, packageType)}
                        disabled={loading}
                        variant="destructive"
                      >
                        <FiTrash2 className="w-4 h-4 mr-2" />
                        Uninstall
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-2 mt-4">
                <Badge variant="secondary">v{pkg.version}</Badge>
                {pkg.installed && (
                  <Badge className="bg-green-100 text-green-800">
                    Installed
                  </Badge>
                )}
                {pkg.outdated && (
                  <Badge className="bg-orange-100 text-orange-800">
                    Update Available
                  </Badge>
                )}
                {pkg.category && (
                  <Badge variant="outline">{pkg.category}</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>{" "}
        <Separator />
        <div className="flex-1 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList className="mx-6 mt-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-6 pb-6">
              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Warnings */}
                {pkg.warnings && pkg.warnings.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FiAlertTriangle className="w-4 h-4" />
                      Warnings & Notices
                    </h3>
                    <div className="space-y-2">
                      {pkg.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${getWarningColor(
                            warning.severity
                          )}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg">
                              {getWarningIcon(warning.type)}
                            </span>
                            <div>
                              <p className="font-medium capitalize">
                                {warning.type || "Warning"}
                              </p>
                              <p className="text-sm mt-1">
                                {warning.message || "No details available"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Package Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FiInfo className="w-4 h-4" />
                      Package Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Version:</span>
                        <span className="font-mono">{pkg.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="capitalize">{packageType}</span>
                      </div>
                      {pkg.installSize && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Install Size:
                          </span>
                          <span>{formatFileSize(pkg.installSize)}</span>
                        </div>
                      )}
                      {pkg.lastUpdated && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Last Updated:
                          </span>
                          <span>{formatDate(pkg.lastUpdated)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Analytics Summary */}
                  {pkg.enhancedAnalytics && (
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FiTrendingUp className="w-4 h-4" />
                        Popularity
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Downloads (365d):
                          </span>
                          <span>
                            {formatDownloads(
                              pkg.enhancedAnalytics.downloads365d
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Popularity Score:
                          </span>
                          <span>{pkg.enhancedAnalytics.popularity}/100</span>
                        </div>
                        {pkg.enhancedAnalytics.rating && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Rating:
                            </span>
                            <div className="flex items-center gap-1">
                              <FiStar className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{pkg.enhancedAnalytics.rating}/5</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Installation Notes */}
                {pkg.caveats && pkg.caveats.trim() && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FiInfo className="w-4 h-4" />
                      Installation Notes
                    </h3>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap text-blue-800 font-mono">
                        {pkg.caveats}
                      </pre>
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="dependencies" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dependencies */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FiPackage className="w-4 h-4" />
                      Dependencies ({pkg.dependencies.length})
                    </h3>
                    {pkg.dependencies.length > 0 ? (
                      <div className="space-y-2">
                        {pkg.dependencies.map((dep, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-muted/50 rounded"
                          >
                            <FiPackage className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{dep}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        This package has no dependencies.
                      </p>
                    )}
                  </div>

                  {/* Conflicts */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FiAlertTriangle className="w-4 h-4" />
                      Conflicts ({pkg.conflicts.length})
                    </h3>
                    {pkg.conflicts.length > 0 ? (
                      <div className="space-y-2">
                        {pkg.conflicts.map((conflict, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded"
                          >
                            <FiAlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="font-mono text-sm text-red-800">
                              {conflict}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        This package has no known conflicts.
                      </p>
                    )}
                  </div>
                </div>

                {/* Dependency Tree Visualization */}
                {pkg.dependencies.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FiGitBranch className="w-4 h-4" />
                      Dependency Tree
                    </h3>
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <div className="font-mono text-sm">
                        <div className="flex items-center gap-2 font-semibold">
                          <FiPackage className="w-4 h-4" />
                          {pkg.name}
                        </div>
                        {pkg.dependencies.map((dep, index) => (
                          <div
                            key={index}
                            className="ml-6 mt-1 flex items-center gap-2"
                          >
                            <span className="text-muted-foreground">
                              {index === pkg.dependencies.length - 1
                                ? "└─"
                                : "├─"}
                            </span>
                            <FiPackage className="w-3 h-3 text-muted-foreground" />
                            <span>{dep}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6 mt-6">
                {pkg.enhancedAnalytics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FiTrendingUp className="w-4 h-4" />
                        Download Statistics
                      </h3>
                      <div className="space-y-3">
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-800 font-medium">
                              365-day Downloads
                            </span>
                            <span className="text-2xl font-bold text-blue-900">
                              {formatDownloads(
                                pkg.enhancedAnalytics.downloads365d
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between">
                            <span className="text-green-800 font-medium">
                              Popularity Score
                            </span>
                            <span className="text-2xl font-bold text-green-900">
                              {pkg.enhancedAnalytics.popularity}/100
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FiUsers className="w-4 h-4" />
                        Community Metrics
                      </h3>
                      <div className="space-y-3">
                        {pkg.enhancedAnalytics.rating && (
                          <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                            <div className="flex items-center justify-between">
                              <span className="text-yellow-800 font-medium">
                                User Rating
                              </span>
                              <div className="flex items-center gap-2">
                                <FiStar className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                <span className="text-xl font-bold text-yellow-900">
                                  {pkg.enhancedAnalytics.rating}/5
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="p-4 bg-muted/50 rounded-lg border">
                          <p className="text-sm text-muted-foreground">
                            This package ranks in the top{" "}
                            <span className="font-semibold">
                              {100 - pkg.enhancedAnalytics.popularity}%
                            </span>{" "}
                            of all Homebrew packages by popularity.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiTrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">
                      No Analytics Available
                    </h3>
                    <p className="text-muted-foreground">
                      Analytics data is not available for this package.
                    </p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="history" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    Installation History
                  </h3>

                  {pkg.installed ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium text-green-800">
                            Currently Installed
                          </p>
                          <p className="text-sm text-green-600">
                            Version {pkg.version}
                          </p>
                        </div>
                        <span className="text-xs text-green-600">Active</span>
                      </div>

                      {pkg.outdated && (
                        <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                          <div className="flex-1">
                            <p className="font-medium text-orange-800">
                              Update Available
                            </p>
                            <p className="text-sm text-orange-600">
                              A newer version is available
                            </p>
                          </div>
                          <span className="text-xs text-orange-600">
                            Pending
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FiPackage className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h4 className="font-medium mb-2">Not Installed</h4>
                      <p className="text-muted-foreground text-sm">
                        This package is not currently installed on your system.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FiClock className="w-4 h-4" />
                    Version Information
                  </h3>

                  <div className="space-y-3">
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">Current Version</span>
                        <Badge variant="secondary">{pkg.version}</Badge>
                      </div>
                      {pkg.lastUpdated && (
                        <p className="text-sm text-muted-foreground">
                          Released on {formatDate(pkg.lastUpdated)}
                        </p>
                      )}
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg border-dashed border-2">
                      <p className="text-sm text-muted-foreground text-center">
                        Detailed version history is not available for this
                        package.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
