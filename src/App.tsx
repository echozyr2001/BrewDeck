import type React from "react";

import { useEffect } from "react";
import { FiSearch, FiPackage, FiRefreshCw, FiGrid } from "react-icons/fi";
import { useBrewStore } from "./stores/brewStore";
import "./App.css";
import { Button } from "./components/ui/button";
import {
  ChevronDown,
  Filter,
  Home,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { PackageCard } from "./components/PackageCard";
import { PackageCardSkeleton } from "./components/PackageCardSkeleton";
import { CategoryCard } from "./components/CategoryCard";
import { PackageTypeToggle } from "./components/PackageTypeToggle";
import { AppSidebar } from "./components/Sidebar";
import { categories } from "./data/categories";

function App() {
  // Zustand store hooks with selective subscriptions
  const {
    brewInfo,
    searchResults,
    loading,
    message,
    activeTab,
    activeType,
    searchQuery,
    setActiveTab,
    setActiveType,
    setSearchQuery,
    clearMessage,
    loadBrewInfo,
    searchPackages,
    installPackage,
    uninstallPackage,
    updatePackage,
    updateAllPackages,
  } = useBrewStore();

  // Load initial data
  useEffect(() => {
    if (activeTab !== "discover") {
      loadBrewInfo();
    }
  }, []);

  const handleSearch = () => {
    searchPackages(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Render search content
  const renderSearchContent = () => (
    <div className="space-y-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold text-foreground mb-3 text-balance">
            Discover
          </h2>
          <p className="text-lg text-muted-foreground">
            Find and install amazing apps and tools for your Mac.
          </p>
        </div>

        <PackageTypeToggle
          activeType={activeType}
          onTypeChange={(type) => {
            setActiveType(type);
            // Clear search results when switching types
            if (searchQuery) {
              searchPackages(searchQuery);
            }
          }}
        />

        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder={`Search for ${
                    activeType === "formula" ? "packages" : "applications"
                  }...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-12 h-12 text-base border-border bg-background"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading}
                size="lg"
                className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Search className="w-5 h-5 mr-2" />
                )}
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <PackageCardSkeleton key={index} />
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {searchResults.map((pkg) => (
            <PackageCard
              key={pkg.name}
              pkg={pkg}
              isSearchResult={true}
              activeTab={activeTab}
              loading={loading}
              onInstall={installPackage}
              onUninstall={uninstallPackage}
              onUpdate={updatePackage}
            />
          ))}
        </div>
      ) : searchQuery && !loading ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <FiSearch size={24} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No results found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or browse categories instead.
          </p>
        </div>
      ) : !searchQuery ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiSearch size={24} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Search for packages
          </h3>
          <p className="text-muted-foreground">
            Enter a package name or keyword to get started.
          </p>
        </div>
      ) : null}
    </div>
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

      <PackageTypeToggle activeType={activeType} onTypeChange={setActiveType} />

      {loading ? (
        <div className="text-center py-16">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-6 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">Loading your apps...</p>
        </div>
      ) : brewInfo ? (
        <div className="space-y-8">
          {brewInfo.packages.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-foreground">
                    Installed{" "}
                    {activeType === "formula" ? "Packages" : "Applications"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing {brewInfo.packages.length}{" "}
                    {activeType === "formula" ? "formulae" : "applications"}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-chart-1 rounded-full"></div>
                    {brewInfo.packages.length} total
                  </span>
                  {brewInfo.packages.filter((pkg) => pkg.outdated).length >
                    0 && (
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-chart-3 rounded-full animate-pulse"></div>
                      {brewInfo.packages.filter((pkg) => pkg.outdated).length}{" "}
                      outdated
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {brewInfo.packages.map((pkg) => (
                  <PackageCard
                    key={pkg.name}
                    pkg={pkg}
                    activeTab={activeTab}
                    loading={loading}
                    onInstall={installPackage}
                    onUninstall={uninstallPackage}
                    onUpdate={updatePackage}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiPackage size={24} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No {activeType === "formula" ? "formulae" : "applications"}{" "}
                installed
              </h3>
              <p className="text-muted-foreground mb-4">
                Try switching to{" "}
                {activeType === "formula" ? "Applications" : "Formulae"} to see
                your installed{" "}
                {activeType === "formula" ? "applications" : "formulae"}.
              </p>
              <Button
                onClick={() =>
                  setActiveType(activeType === "formula" ? "cask" : "formula")
                }
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Switch to{" "}
                {activeType === "formula" ? "Applications" : "Formulae"}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
          <h3 className="text-2xl font-semibold mb-3">No Apps Found</h3>
          <p className="text-lg text-muted-foreground mb-6">
            Make sure Homebrew is installed and try refreshing.
          </p>
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Refresh Now
          </Button>
        </div>
      )}
    </div>
  );

  // Render discover content
  const renderDiscoverContent = () => (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
            <FiGrid size={24} className="text-primary-foreground" />
          </div>
          <h2 className="text-4xl font-bold text-foreground text-balance">
            Discover Applications
          </h2>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Browse our curated collection of categories to find the perfect
          applications for your workflow
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onCategoryClick={(category) => {
              setActiveType("cask");
              setActiveTab("search");
              setSearchQuery(category.id.toLowerCase());
              searchPackages(category.id.toLowerCase());
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="flex h-screen w-full">
        <AppSidebar
          activeTab={activeTab}
          brewInfo={brewInfo}
          onTabChange={setActiveTab}
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
                    {activeTab}
                  </span>
                  {(activeTab === "search" || activeTab === "installed") && (
                    <>
                      <span>/</span>
                      <span className="text-foreground font-medium capitalize">
                        {activeType === "formula" ? "Formulae" : "Applications"}
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
                {brewInfo && brewInfo.total_outdated > 0 && (
                  <Button
                    onClick={updateAllPackages}
                    disabled={loading}
                    className="bg-chart-1 text-white hover:bg-chart-1/90"
                  >
                    <FiRefreshCw
                      size={18}
                      className={loading ? "animate-spin mr-2" : "mr-2"}
                    />
                    Update All ({brewInfo.total_outdated})
                  </Button>
                )}
                <Button
                  onClick={loadBrewInfo}
                  disabled={loading}
                  variant="outline"
                  className="border-border hover:bg-muted bg-transparent"
                >
                  <FiRefreshCw
                    size={18}
                    className={loading ? "animate-spin mr-2" : "mr-2"}
                  />
                  Refresh
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
              {activeTab === "search" && renderSearchContent()}
              {activeTab === "installed" && renderInstalledContent()}
              {activeTab === "discover" && renderDiscoverContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
