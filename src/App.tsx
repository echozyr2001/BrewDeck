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
          <h2 className="text-3xl font-serif font-bold text-foreground mb-3">
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

        <Card className="shadow-sm border-border/30 bg-card/50 backdrop-blur-sm">
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
                  className="pl-12 h-12 text-base rounded-xl border-border/30"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading}
                size="lg"
                className="h-12 px-8 rounded-xl font-semibold"
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <PackageCardSkeleton key={index} />
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiSearch size={24} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            No results found
          </h3>
          <p className="text-slate-500">
            Try adjusting your search terms or browse categories instead.
          </p>
        </div>
      ) : !searchQuery ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiSearch size={24} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Search for packages
          </h3>
          <p className="text-slate-500">
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
        <h2 className="text-3xl font-serif font-bold text-foreground mb-3">
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
                  <h3 className="text-2xl font-serif font-bold text-foreground">
                    Installed{" "}
                    {activeType === "formula" ? "Packages" : "Applications"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing {brewInfo.packages.length}{" "}
                    {activeType === "formula" ? "formulae" : "applications"}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {brewInfo.packages.length} total
                  </span>
                  {brewInfo.packages.filter((pkg) => pkg.outdated).length >
                    0 && (
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      {brewInfo.packages.filter((pkg) => pkg.outdated).length}{" "}
                      outdated
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiPackage size={24} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                No {activeType === "formula" ? "formulae" : "applications"}{" "}
                installed
              </h3>
              <p className="text-slate-500 mb-4">
                Try switching to{" "}
                {activeType === "formula" ? "Applications" : "Formulae"} to see
                your installed{" "}
                {activeType === "formula" ? "applications" : "formulae"}.
              </p>
              <button
                onClick={() =>
                  setActiveType(activeType === "formula" ? "cask" : "formula")
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Switch to{" "}
                {activeType === "formula" ? "Applications" : "Formulae"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
          <h3 className="text-2xl font-serif font-bold mb-3">No Apps Found</h3>
          <p className="text-lg text-muted-foreground mb-6">
            Make sure Homebrew is installed and try refreshing.
          </p>
          <Button size="lg">
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
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/25">
            <FiGrid size={24} className="text-white" />
          </div>
          <h2 className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Discover Applications
          </h2>
        </div>
        <p className="text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
          Browse our curated collection of categories to find the perfect
          applications for your workflow
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
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
                    className="group relative inline-flex items-center gap-3 px-6 py-3 text-white rounded-2xl font-semibold shadow-xl shadow-green-500/25 hover:shadow-2xl hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <FiRefreshCw
                      size={18}
                      className={
                        loading
                          ? "animate-spin"
                          : "group-hover:rotate-180 transition-transform duration-300"
                      }
                    />
                    <span>Update All ({brewInfo.total_outdated})</span>
                  </Button>
                )}
                <Button
                  onClick={loadBrewInfo}
                  disabled={loading}
                  className="group inline-flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm border border-white/40 text-slate-700 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:bg-white/90 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiRefreshCw
                    size={18}
                    className={
                      loading
                        ? "animate-spin"
                        : "group-hover:rotate-180 transition-transform duration-300"
                    }
                  />
                  <span>Refresh</span>
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
