import { useCallback, useMemo } from "react";
import { useBrewStore } from "../stores/brewStore";
/**
 * Custom hook for detailed package information
 * Provides comprehensive package data and analysis
 */
export const usePackageDetails = (
  packageName: string,
  packageType: "formula" | "cask"
) => {
  const { formulae, casks, getPackagesByType, getActiveOperations } =
    useBrewStore();

  // Get the specific package
  const packageData = useMemo(() => {
    const packages = packageType === "formula" ? formulae : casks;
    return packages[packageName] || null;
  }, [packageName, packageType, formulae, casks]);

  // Check if package exists
  const exists = useMemo(() => !!packageData, [packageData]);

  // Get package operation status
  const operationStatus = useMemo(() => {
    const activeOps = getActiveOperations();
    return activeOps.find(
      (op) => op.packageName === packageName && op.packageType === packageType
    );
  }, [getActiveOperations, packageName, packageType]);

  // Check if package has active operation
  const hasActiveOperation = useMemo(
    () => !!operationStatus,
    [operationStatus]
  );

  // Get package dependencies with details
  const getDependencyDetails = useCallback(() => {
    if (!packageData?.dependencies) return [];

    const allPackages = getPackagesByType(packageType);
    const packageMap = new Map(allPackages.map((pkg) => [pkg.name, pkg]));

    return packageData.dependencies.map((depName) => {
      const depPackage = packageMap.get(depName);
      return {
        name: depName,
        installed: depPackage?.installed || false,
        version: depPackage?.version,
        description: depPackage?.description,
        exists: !!depPackage,
      };
    });
  }, [packageData, packageType, getPackagesByType]);

  // Get packages that depend on this package
  const getDependents = useCallback(() => {
    if (!packageData) return [];

    const allPackages = getPackagesByType(packageType);
    return allPackages.filter((pkg) =>
      pkg.dependencies.includes(packageData.name)
    );
  }, [packageData, packageType, getPackagesByType]);

  // Get package conflicts with details
  const getConflictDetails = useCallback(() => {
    if (!packageData?.conflicts) return [];

    const allPackages = getPackagesByType(packageType);
    const packageMap = new Map(allPackages.map((pkg) => [pkg.name, pkg]));

    return packageData.conflicts.map((conflictName) => {
      const conflictPackage = packageMap.get(conflictName);
      return {
        name: conflictName,
        installed: conflictPackage?.installed || false,
        version: conflictPackage?.version,
        description: conflictPackage?.description,
        exists: !!conflictPackage,
        severity: conflictPackage?.installed
          ? "high"
          : ("low" as "high" | "low"),
      };
    });
  }, [packageData, packageType, getPackagesByType]);

  // Analyze package warnings
  const getWarningAnalysis = useCallback(() => {
    if (!packageData?.warnings)
      return {
        total: 0,
        bySeverity: {},
        byType: {},
        critical: [],
        moderate: [],
        minor: [],
      };

    const analysis = {
      total: packageData.warnings.length,
      bySeverity: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      critical: packageData.warnings.filter((w) => w.severity === "high"),
      moderate: packageData.warnings.filter((w) => w.severity === "medium"),
      minor: packageData.warnings.filter((w) => w.severity === "low"),
    };

    packageData.warnings.forEach((warning) => {
      analysis.bySeverity[warning.severity] =
        (analysis.bySeverity[warning.severity] || 0) + 1;
      analysis.byType[warning.type] = (analysis.byType[warning.type] || 0) + 1;
    });

    return analysis;
  }, [packageData]);

  // Get package size information
  const getSizeInfo = useCallback(() => {
    if (!packageData) return null;

    const sizeInBytes = packageData.installSize || 0;
    const sizeInKB = Math.round(sizeInBytes / 1024);
    const sizeInMB = Math.round((sizeInKB / 1024) * 100) / 100;
    const sizeInGB = Math.round((sizeInMB / 1024) * 100) / 100;

    let displaySize: string;
    let displayUnit: string;

    if (sizeInGB >= 1) {
      displaySize = sizeInGB.toString();
      displayUnit = "GB";
    } else if (sizeInMB >= 1) {
      displaySize = sizeInMB.toString();
      displayUnit = "MB";
    } else if (sizeInKB >= 1) {
      displaySize = sizeInKB.toString();
      displayUnit = "KB";
    } else {
      displaySize = sizeInBytes.toString();
      displayUnit = "bytes";
    }

    return {
      bytes: sizeInBytes,
      kb: sizeInKB,
      mb: sizeInMB,
      gb: sizeInGB,
      display: `${displaySize} ${displayUnit}`,
      category: sizeInGB >= 1 ? "large" : sizeInMB >= 100 ? "medium" : "small",
    };
  }, [packageData]);

  // Get package popularity metrics
  const getPopularityMetrics = useCallback(() => {
    if (!packageData?.enhancedAnalytics) return null;

    const analytics = packageData.enhancedAnalytics;
    const popularityScore = analytics.popularity;

    let popularityLevel: "low" | "medium" | "high";
    if (popularityScore >= 0.7) {
      popularityLevel = "high";
    } else if (popularityScore >= 0.3) {
      popularityLevel = "medium";
    } else {
      popularityLevel = "low";
    }

    return {
      score: popularityScore,
      level: popularityLevel,
      downloads: analytics.downloads365d,
      rating: analytics.rating,
      percentile: Math.round(popularityScore * 100),
    };
  }, [packageData]);

  // Check if package is safe to install
  const getSafetyAssessment = useCallback(() => {
    if (!packageData) return null;

    const warnings = getWarningAnalysis();
    const conflicts = getConflictDetails();
    const installedConflicts = conflicts.filter((c) => c.installed);

    let safetyLevel: "safe" | "caution" | "warning" | "danger";
    const issues: string[] = [];

    if (warnings.critical.length > 0) {
      safetyLevel = "danger";
      issues.push(
        `${warnings.critical.length} critical security/compatibility issues`
      );
    } else if (installedConflicts.length > 0) {
      safetyLevel = "warning";
      issues.push(
        `Conflicts with ${installedConflicts.length} installed packages`
      );
    } else if (warnings.moderate.length > 0) {
      safetyLevel = "caution";
      issues.push(`${warnings.moderate.length} moderate warnings`);
    } else {
      safetyLevel = "safe";
    }

    return {
      level: safetyLevel,
      issues,
      canInstall: safetyLevel !== "danger",
      recommendInstall: safetyLevel === "safe",
      warningCount: warnings.total,
      conflictCount: installedConflicts.length,
    };
  }, [packageData, getWarningAnalysis, getConflictDetails]);

  // Get installation recommendations
  const getInstallationRecommendations = useCallback(() => {
    if (!packageData) return [];

    const recommendations: string[] = [];
    const safety = getSafetyAssessment();
    const dependencies = getDependencyDetails();
    const missingDeps = dependencies.filter((dep) => !dep.installed);

    if (missingDeps.length > 0) {
      recommendations.push(
        `Install ${missingDeps.length} missing dependencies first`
      );
    }

    if (safety?.issues.length) {
      recommendations.push(...safety.issues);
    }

    if (packageData.caveats) {
      recommendations.push("Review installation notes and caveats");
    }

    const size = getSizeInfo();
    if (size && size.category === "large") {
      recommendations.push(`Large download size: ${size.display}`);
    }

    return recommendations;
  }, [packageData, getSafetyAssessment, getDependencyDetails, getSizeInfo]);

  return {
    // Basic package info
    package: packageData,
    exists,

    // Operation status
    operationStatus,
    hasActiveOperation,

    // Dependencies and conflicts
    dependencies: getDependencyDetails(),
    dependents: getDependents(),
    conflicts: getConflictDetails(),

    // Analysis
    warningAnalysis: getWarningAnalysis(),
    sizeInfo: getSizeInfo(),
    popularityMetrics: getPopularityMetrics(),
    safetyAssessment: getSafetyAssessment(),

    // Recommendations
    installationRecommendations: getInstallationRecommendations(),

    // Computed properties
    isInstalled: packageData?.installed || false,
    isOutdated: packageData?.outdated || false,
    hasWarnings: (packageData?.warnings?.length || 0) > 0,
    hasConflicts: (packageData?.conflicts?.length || 0) > 0,
    hasDependencies: (packageData?.dependencies?.length || 0) > 0,
    hasCaveats: !!packageData?.caveats?.trim(),
  };
};

export default usePackageDetails;
