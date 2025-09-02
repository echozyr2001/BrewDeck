import { useEffect } from "react";
import { FiPackage, FiRefreshCw } from "react-icons/fi";
import { useBrewStore } from "./stores/brewStore";
import "./App.css";
import { Button } from "./components/ui/button";
import { ChevronDown, Filter, Home, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { PackageCard } from "./components/PackageCard";
import { PackageTypeToggle } from "./components/PackageTypeToggle";
import { AppSidebar } from "./components/Sidebar";
import { AdvancedSearchView } from "./components/AdvancedSearchView";
import { EnhancedDiscoverView } from "./components/EnhancedDiscoverView";

function App() {
  // Zustand store hooks with selective subscriptions
  const {
    loading,
    message,
    activeView,
    activeTab,
    setActiveView,
    setActiveTab,
    clearMessage,
    loadPackages,
    installPackage,
    uninstallPackage,
    updatePackage,
    updateAllPackages,
    getInstalledPackages,
    getOutdatedPackages,
    clearCache,
  } = useBrewStore();

  // Load initial data
  useEffect(() => {
    if (activeView !== "discover") {
      loadPackages(activeTab);
    }
  }, [activeView, activeTab]);

  // Dummy functions for sidebar compatibility
  const setSearchQuery = () => {};
  const handleSearch = () => {};

  // Render search content - now using AdvancedSearchView
  const renderSearchContent = () => (
    <AdvancedSearchView />
  );

  // Render installed content
  const renderInstalledContent = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-foreground mb-3 text-balance">
          My Apps
        </h2>
        <p className="text-lg text-muted-foreground">
          Manage your installed applications and tools.
        </p>
      </div>

      <PackageTypeToggle activeType={activeTab} onTypeChange={setActiveTab} />

      {(activeTab === "formula" ? loading.formulae : loading.casks) ? (
        <div className="text-center py-16">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-6 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">Loading your apps...</p>
        </div>
      ) : getInstalledPackages(activeTab).length > 0 ? (
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-foreground">
                  Installed{" "}
                  {activeTab === "formula" ? "Packages" : "Applications"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Showing {getInstalledPackages(activeTab).length}{" "}
                  {activeTab === "formula" ? "formulae" : "applications"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-chart-1 rounded-full"></div>
                  {getInstalledPackages(activeTab).length} total
                </span>
                {getOutdatedPackages(activeTab).length > 0 && (
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-chart-3 rounded-full animate-pulse"></div>
                    {getOutdatedPackages(activeTab).length} outdated
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {getInstalledPackages(activeTab).map((pkg) => (
                <PackageCard
                  key={pkg.name}
                  pkg={pkg}
                  activeTab={activeView}
                  loading={
                    activeTab === "formula" ? loading.formulae : loading.casks
                  }
                  onInstall={(name) => installPackage(name, activeTab)}
                  onUninstall={(name) => uninstallPackage(name, activeTab)}
                  onUpdate={(name) => updatePackage(name, activeTab)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiPackage size={24} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No {activeTab === "formula" ? "formulae" : "applications"} installed
          </h3>
          <p className="text-muted-foreground mb-4">
            Try switching to{" "}
            {activeTab === "formula" ? "Applications" : "Formulae"} to see your
            installed {activeTab === "formula" ? "applications" : "formulae"}.
          </p>
          <Button
            onClick={() =>
              setActiveTab(activeTab === "formula" ? "cask" : "formula")
            }
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Switch to {activeTab === "formula" ? "Applications" : "Formulae"}
          </Button>
        </div>
      )}
    </div>
  );

  // Render discover content - now using EnhancedDiscoverView
  const renderDiscoverContent = () => (
    <EnhancedDiscoverView />
  );

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="flex h-screen w-full">
        <AppSidebar
          activeTab={activeView === "updates" ? "installed" : activeView}
          brewInfo={null}
          onTabChange={setActiveView}
          onSearchQueryChange={setSearchQuery}
          onSearch={handleSearch}
        />

        <main className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
          <header className="bg-background border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Home className="w-4 h-4" />
                  <span>/</span>
                  <span className="text-foreground font-medium capitalize">
                    {activeView}
                  </span>
                  {(activeView === "search" || activeView === "installed") && (
                    <>
                      <span>/</span>
                      <span className="text-foreground font-medium capitalize">
                        {activeTab === "formula" ? "Formulae" : "Applications"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      View all
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>All packages</DropdownMenuItem>
                    <DropdownMenuItem>Recently updated</DropdownMenuItem>
                    <DropdownMenuItem>Most popular</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {getOutdatedPackages(activeTab).length > 0 && (
                  <Button
                    onClick={() => updateAllPackages(activeTab)}
                    disabled={
                      activeTab === "formula" ? loading.formulae : loading.casks
                    }
                    className="bg-chart-1 text-white hover:bg-chart-1/90"
                  >
                    <FiRefreshCw
                      size={18}
                      className={
                        (
                          activeTab === "formula"
                            ? loading.formulae
                            : loading.casks
                        )
                          ? "animate-spin mr-2"
                          : "mr-2"
                      }
                    />
                    Update All ({getOutdatedPackages(activeTab).length})
                  </Button>
                )}
                <Button
                  onClick={() => loadPackages(activeTab)}
                  disabled={
                    activeTab === "formula" ? loading.formulae : loading.casks
                  }
                  variant="outline"
                  className="border-border hover:bg-muted bg-transparent"
                >
                  <FiRefreshCw
                    size={18}
                    className={
                      (
                        activeTab === "formula"
                          ? loading.formulae
                          : loading.casks
                      )
                        ? "animate-spin mr-2"
                        : "mr-2"
                    }
                  />
                  Refresh
                </Button>
                <Button
                  onClick={() => {
                    clearCache();
                    setActiveView("discover");
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Clear Cache
                </Button>
              </div>
            </div>
          </header>

          {/* Message Banner */}
          {message && (
            <div className="bg-accent/10 border-b border-accent/20 px-6 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-accent-foreground">
                  {message}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearMessage()}
                >
                  ×
                </Button>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-auto w-full">
            <div className="space-y-8 p-6 w-full max-w-none">
              {activeView === "search" && renderSearchContent()}
              {activeView === "installed" && renderInstalledContent()}
              {activeView === "discover" && renderDiscoverContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
