import type React from "react";

import {
  FiDownload,
  FiTrash2,
  FiRefreshCw,
  FiExternalLink,
} from "react-icons/fi";
import type { BrewPackage } from "../stores/brewStore";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AppIcon } from "./AppIcon";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface PackageCardProps {
  pkg: BrewPackage;
  isSearchResult?: boolean;
  activeTab?: string;
  loading?: boolean;
  onInstall?: (name: string) => void;
  onUninstall?: (name: string) => void;
  onUpdate?: (name: string) => void;
}

export const PackageCard = ({
  pkg,
  isSearchResult = false,
  activeTab,
  loading = false,
  onInstall,
  onUninstall,
  onUpdate,
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

  return (
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
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
                {pkg.name}
              </h3>
              {hasHomepage && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiExternalLink size={14} className="text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {!pkg.installed &&
                (isSearchResult || activeTab === "discover") && (
                  <Button
                    onClick={(e) =>
                      handleActionClick(e, () => onInstall?.(pkg.name))
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
                        handleActionClick(e, () => onUpdate?.(pkg.name))
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
                      handleActionClick(e, () => onUninstall?.(pkg.name))
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
          </div>
        </div>
      </div>
    </div>
  );
};
