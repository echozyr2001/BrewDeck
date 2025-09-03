import React, { useState } from "react";
import { useBrewStore } from "../stores/brewStore";
import { usePackageSearch } from "../hooks/usePackageSearch";
import { AdvancedSearchBar } from "./AdvancedSearchBar";
import { SearchResults } from "./SearchResults";
import { PackageTabBar } from "./PackageTabBar";
import PackageDetailsModal from "./PackageDetailsModal";
import { AdvancedFilters } from "./AdvancedFilters";
import { useUserPreferences } from "../hooks/useUserPreferences";
import type { EnhancedBrewPackage } from "../stores/brewStore";

interface AdvancedSearchViewProps {
  className?: string;
}

const AdvancedSearchView: React.FC<AdvancedSearchViewProps> = ({
  className = "",
}) => {
  const {
    activeTab,
    setActiveTab,
    installPackage,
    uninstallPackage,
    updatePackage,
    getPackagesByType,
    loading,
  } = useBrewStore();

  const {
    searchQuery,
    search,
    searchHistory,
    clearHistory,
    filters,
    updateFilters,
    sortOptions,
    updateSortOptions,
    getFilteredResults,
    getSearchSuggestions,
    isSearching,
  } = usePackageSearch(activeTab);

  const { preferences } = useUserPreferences();

  // Local state for package details modal and view mode
  const [selectedPackage, setSelectedPackage] =
    useState<EnhancedBrewPackage | null>(null);
  const [showPackageDetails, setShowPackageDetails] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    preferences.view.viewMode
  );

  // Get filtered and sorted results
  const searchResults = getFilteredResults();

  // Get package counts for tab bar
  const formulaeCount = getPackagesByType("formula").length;
  const casksCount = getPackagesByType("cask").length;

  // Get search suggestions
  const suggestions = getSearchSuggestions(5);

  // Handle package actions
  const handleInstall = (packageName: string) => {
    installPackage(packageName, activeTab);
  };

  const handleUninstall = (packageName: string) => {
    uninstallPackage(packageName, activeTab);
  };

  const handleUpdate = (packageName: string) => {
    updatePackage(packageName, activeTab);
  };

  // Handle package details
  const handlePackageClick = (pkg: EnhancedBrewPackage) => {
    setSelectedPackage(pkg);
    setShowPackageDetails(true);
  };

  const handleClosePackageDetails = () => {
    setShowPackageDetails(false);
    setSelectedPackage(null);
  };

  // Handle tab change
  const handleTabChange = (tab: "formula" | "cask") => {
    setActiveTab(tab);
    // Re-search with new package type if we have a query
    if (searchQuery.trim()) {
      search(searchQuery);
    }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold text-foreground mb-3 text-balance">
            Advanced Search
          </h2>
          <p className="text-lg text-muted-foreground">
            Find packages with powerful filtering and sorting options.
          </p>
        </div>

        {/* Package Type Tabs */}
        <PackageTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          counts={{
            formulae: formulaeCount,
            casks: casksCount,
          }}
          loading={{
            formulae: loading.formulae,
            casks: loading.casks,
          }}
        />

        {/* Advanced Search Bar */}
        <AdvancedSearchBar
          query={searchQuery}
          onQueryChange={(query) => {
            // Update query immediately for UI responsiveness
            useBrewStore.getState().setSearchQuery(query);
          }}
          onSearch={search}
          filters={filters}
          onFiltersChange={updateFilters}
          sortOptions={sortOptions}
          onSortChange={updateSortOptions}
          suggestions={suggestions}
          searchHistory={searchHistory}
          onClearHistory={clearHistory}
          loading={isSearching}
          placeholder={`Search for ${
            activeTab === "formula" ? "packages" : "applications"
          }...`}
        />

        {/* Advanced Filters */}
        <AdvancedFilters
          filters={filters}
          onFiltersChange={updateFilters}
          sortOptions={sortOptions}
          onSortChange={updateSortOptions}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Search Results */}
      <SearchResults
        results={searchResults}
        query={searchQuery}
        loading={isSearching}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        onUpdate={handleUpdate}
        onPackageClick={handlePackageClick}
        viewMode={viewMode}
        density={preferences.view.gridDensity}
        showAnalytics={preferences.view.showAnalytics}
        showDescriptions={preferences.view.showDescriptions}
        packageType={activeTab}
        useVirtualization={true}
        virtualizationThreshold={50}
      />

      {/* Package Details Modal */}
      {selectedPackage && (
        <PackageDetailsModal
          pkg={selectedPackage}
          isOpen={showPackageDetails}
          onClose={handleClosePackageDetails}
          onInstall={() => handleInstall(selectedPackage.name)}
          onUninstall={() => handleUninstall(selectedPackage.name)}
          onUpdate={() => handleUpdate(selectedPackage.name)}
        />
      )}
    </div>
  );
};

export default AdvancedSearchView;
