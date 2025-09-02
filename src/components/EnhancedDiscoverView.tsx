import React, { useState } from "react";
import { CategoryBrowser } from "./CategoryBrowser";
import { CategoryDetailView } from "./CategoryDetailView";
import { PackageDetailsModal } from "./PackageDetailsModal";
import { useBrewStore } from "../stores/brewStore";
import type { Category } from "../data/categories";
import type { EnhancedBrewPackage } from "../stores/brewStore";

interface EnhancedDiscoverViewProps {
  className?: string;
}

export const EnhancedDiscoverView: React.FC<EnhancedDiscoverViewProps> = ({
  className = "",
}) => {
  const { installPackage, uninstallPackage, updatePackage } = useBrewStore();
  
  // Local state for navigation
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<EnhancedBrewPackage | null>(null);
  const [showPackageDetails, setShowPackageDetails] = useState(false);

  // Handle category selection
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };

  // Handle back to categories
  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  // Handle package selection
  const handlePackageSelect = (pkg: EnhancedBrewPackage) => {
    setSelectedPackage(pkg);
    setShowPackageDetails(true);
  };

  // Handle package details modal close
  const handleClosePackageDetails = () => {
    setShowPackageDetails(false);
    setSelectedPackage(null);
  };

  // Handle package actions
  const handleInstall = (packageName: string) => {
    installPackage(packageName, "cask"); // Categories are cask-focused
  };

  const handleUninstall = (packageName: string) => {
    uninstallPackage(packageName, "cask");
  };

  const handleUpdate = (packageName: string) => {
    updatePackage(packageName, "cask");
  };

  return (
    <div className={className}>
      {selectedCategory ? (
        <CategoryDetailView
          category={selectedCategory}
          onBack={handleBackToCategories}
          onPackageSelect={handlePackageSelect}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          onUpdate={handleUpdate}
        />
      ) : (
        <CategoryBrowser
          onCategorySelect={handleCategorySelect}
          onPackageSelect={handlePackageSelect}
        />
      )}

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