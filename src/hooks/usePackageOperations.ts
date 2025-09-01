import { useCallback } from 'react';
import { useBrewStore } from '../stores/brewStore';
import type { PackageOperation } from '../stores/brewStore';

/**
 * Custom hook for managing package operations (install, uninstall, update)
 * Provides a clean interface for package management with operation tracking
 */
export const usePackageOperations = () => {
  const {
    installPackage,
    uninstallPackage,
    updatePackage,
    updateAllPackages,
    operations,
    getActiveOperations,
    loading,
  } = useBrewStore();

  // Install a package with operation tracking
  const install = useCallback(
    async (packageName: string, packageType: 'formula' | 'cask') => {
      return installPackage(packageName, packageType);
    },
    [installPackage]
  );

  // Uninstall a package with operation tracking
  const uninstall = useCallback(
    async (packageName: string, packageType: 'formula' | 'cask') => {
      return uninstallPackage(packageName, packageType);
    },
    [uninstallPackage]
  );

  // Update a specific package
  const update = useCallback(
    async (packageName: string, packageType: 'formula' | 'cask') => {
      return updatePackage(packageName, packageType);
    },
    [updatePackage]
  );

  // Update all packages of a specific type
  const updateAll = useCallback(
    async (packageType: 'formula' | 'cask') => {
      return updateAllPackages(packageType);
    },
    [updateAllPackages]
  );

  // Check if a specific package has an active operation
  const isPackageOperationActive = useCallback(
    (packageName: string): boolean => {
      const activeOps = getActiveOperations();
      return activeOps.some(op => op.packageName === packageName);
    },
    [getActiveOperations]
  );

  // Get the current operation for a specific package
  const getPackageOperation = useCallback(
    (packageName: string): PackageOperation | undefined => {
      const activeOps = getActiveOperations();
      return activeOps.find(op => op.packageName === packageName);
    },
    [getActiveOperations]
  );

  // Check if any operations are currently running
  const hasActiveOperations = useCallback((): boolean => {
    return getActiveOperations().length > 0;
  }, [getActiveOperations]);

  // Get operations by type
  const getOperationsByType = useCallback(
    (type: 'install' | 'uninstall' | 'update'): PackageOperation[] => {
      return Object.values(operations).filter(op => op.type === type);
    },
    [operations]
  );

  // Get operations by package type
  const getOperationsByPackageType = useCallback(
    (packageType: 'formula' | 'cask'): PackageOperation[] => {
      return Object.values(operations).filter(op => op.packageType === packageType);
    },
    [operations]
  );

  return {
    // Core operations
    install,
    uninstall,
    update,
    updateAll,
    
    // Operation status
    operations,
    activeOperations: getActiveOperations(),
    isPackageOperationActive,
    getPackageOperation,
    hasActiveOperations,
    
    // Operation queries
    getOperationsByType,
    getOperationsByPackageType,
    
    // Loading states
    loading,
  };
};

export default usePackageOperations;