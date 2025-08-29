import {
  FiDownload,
  FiTrash2,
  FiRefreshCw,
  FiExternalLink,
} from "react-icons/fi";
import { type BrewPackage } from "../stores/brewStore";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AppIcon } from "./AppIcon";

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
    // 阻止事件冒泡，避免触发按钮的点击事件
    e.stopPropagation();

    // 如果包有homepage，则打开官网
    if (pkg.homepage && pkg.homepage.trim() !== "") {
      // 确保URL有协议前缀
      let url = pkg.homepage.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      console.log("Opening homepage:", url);
      try {
        await openUrl(url);
      } catch (error) {
        console.error("Failed to open URL with Tauri opener:", error);
        // 如果 Tauri opener 失败，尝试使用 window.open 作为后备
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
      className={`group relative bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/40 shadow-lg shadow-slate-200/20 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 hover:border-indigo-200/50 ${
        hasHomepage ? "cursor-pointer" : ""
      }`}
      onClick={handleCardClick}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-white/20 to-purple-50/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <div className="relative z-10">
        <div className="flex items-start gap-5">
          <div className="relative flex-shrink-0">
            <AppIcon packageName={pkg.name} description={pkg.description} />
            {pkg.installed && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
            {pkg.outdated && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-400 to-red-500 rounded-full border-2 border-white shadow-md animate-pulse"></div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors duration-300">
                  {pkg.name}
                </h3>
                {pkg.homepage && pkg.homepage.trim() !== "" && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <FiExternalLink size={12} className="text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">
                      Visit
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {!pkg.installed &&
                  (isSearchResult || activeTab === "discover") && (
                    <button
                      onClick={(e) =>
                        handleActionClick(e, () => onInstall?.(pkg.name))
                      }
                      disabled={loading}
                      className="group/btn relative inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl font-semibold shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <FiDownload
                        size={16}
                        className="group-hover/btn:scale-110 transition-transform duration-200"
                      />
                      <span>Install</span>
                      <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                    </button>
                  )}
                {pkg.installed && (
                  <div className="flex flex-col gap-2">
                    {pkg.outdated && (
                      <button
                        onClick={(e) =>
                          handleActionClick(e, () => onUpdate?.(pkg.name))
                        }
                        disabled={loading}
                        className="group/btn relative inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white rounded-2xl font-semibold shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <FiRefreshCw
                          size={16}
                          className="group-hover/btn:rotate-180 transition-transform duration-300"
                        />
                        <span>Update</span>
                        <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                      </button>
                    )}
                    <button
                      onClick={(e) =>
                        handleActionClick(e, () => onUninstall?.(pkg.name))
                      }
                      disabled={loading}
                      className="group/btn inline-flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:bg-red-50 hover:border-red-200 hover:text-red-700 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiTrash2
                        size={16}
                        className="group-hover/btn:scale-110 transition-transform duration-200"
                      />
                      <span>Remove</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed mb-4 line-clamp-2 group-hover:text-slate-700 transition-colors duration-300">
              {pkg.description}
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500">
                  VERSION
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {pkg.version}
                </span>
              </div>
              {pkg.installed && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-xl border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-green-700">
                    Installed
                  </span>
                </div>
              )}
              {pkg.outdated && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 rounded-xl border border-orange-200">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-orange-700">
                    Update Available
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
