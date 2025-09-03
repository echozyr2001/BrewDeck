import React, {
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import { List, type RowComponentProps, useListRef } from "react-window";
import type { EnhancedBrewPackage } from "../stores/brewStore";
import { PackageCard } from "./PackageCard";
import { PackageCardSkeleton } from "./PackageCardSkeleton";

interface VirtualizedPackageListProps {
  packages: EnhancedBrewPackage[];
  loading?: boolean;
  onInstall?: (name: string, packageType: "formula" | "cask") => void;
  onUninstall?: (name: string, packageType: "formula" | "cask") => void;
  onUpdate?: (name: string, packageType: "formula" | "cask") => void;
  onPackageClick?: (pkg: EnhancedBrewPackage) => void;
  packageType?: "formula" | "cask";
  viewMode?: "grid" | "list";
  density?: "compact" | "comfortable" | "spacious";
  className?: string;
  height?: number;
  itemsPerRow?: number;
}

// Item height calculations based on density and view mode
const getItemHeight = (
  density: "compact" | "comfortable" | "spacious",
  viewMode: "grid" | "list"
): number => {
  if (viewMode === "list") {
    switch (density) {
      case "compact":
        return 80;
      case "spacious":
        return 120;
      default:
        return 100; // comfortable
    }
  } else {
    // Grid mode - taller cards
    switch (density) {
      case "compact":
        return 200;
      case "spacious":
        return 320;
      default:
        return 260; // comfortable
    }
  }
};

// Calculate dynamic item height based on content
const useDynamicItemHeight = (
  packages: EnhancedBrewPackage[],
  density: "compact" | "comfortable" | "spacious",
  viewMode: "grid" | "list"
) => {
  const [itemHeights, setItemHeights] = useState<number[]>([]);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const baseHeight = getItemHeight(density, viewMode);

  useEffect(() => {
    const heights = packages.map((pkg, index) => {
      const element = itemRefs.current.get(index);
      if (element) {
        return element.offsetHeight;
      }

      // Estimate height based on content
      let estimatedHeight = baseHeight;

      // Add height for warnings
      if (pkg.warnings && pkg.warnings.length > 0) {
        estimatedHeight += 20;
      }

      // Add height for caveats
      if (pkg.caveats && pkg.caveats.trim()) {
        estimatedHeight += 40;
      }

      // Add height for long descriptions
      if (pkg.description.length > 100) {
        estimatedHeight += 20;
      }

      return estimatedHeight;
    });

    setItemHeights(heights);
  }, [packages, baseHeight]);

  const getDynamicItemHeight = useCallback(
    (index: number) => {
      return itemHeights[index] || baseHeight;
    },
    [itemHeights, baseHeight]
  );

  const setItemRef = useCallback(
    (index: number, element: HTMLDivElement | null) => {
      if (element) {
        itemRefs.current.set(index, element);
      } else {
        itemRefs.current.delete(index);
      }
    },
    []
  );

  return { getItemHeight: getDynamicItemHeight, setItemRef };
};

// Grid item component for virtualized rendering
const GridItem = ({
  index,
  style,
  packages,
  itemsPerRow,
  onInstall,
  onUninstall,
  onUpdate,
  packageType,
  density,
  setItemRef,
}: RowComponentProps<{
  packages: EnhancedBrewPackage[];
  itemsPerRow: number;
  onInstall?: (name: string, packageType: "formula" | "cask") => void;
  onUninstall?: (name: string, packageType: "formula" | "cask") => void;
  onUpdate?: (name: string, packageType: "formula" | "cask") => void;
  onPackageClick?: (pkg: EnhancedBrewPackage) => void;
  packageType: "formula" | "cask";
  density: "compact" | "comfortable" | "spacious";
  setItemRef: (index: number, element: HTMLDivElement | null) => void;
}>) => {
  const startIndex = index * itemsPerRow;
  const endIndex = Math.min(startIndex + itemsPerRow, packages.length);
  const rowPackages = packages.slice(startIndex, endIndex);

  return (
    <div
      style={style}
      className={`flex gap-6 ${
        density === "compact"
          ? "gap-4"
          : density === "spacious"
          ? "gap-8"
          : "gap-6"
      }`}
      ref={(el) => setItemRef(index, el)}
    >
      {rowPackages.map((pkg) => (
        <div key={pkg.name} className="flex-1" style={{ minWidth: 0 }}>
          <PackageCard
            pkg={pkg}
            onInstall={onInstall}
            onUninstall={onUninstall}
            onUpdate={onUpdate}
            packageType={packageType}
          />
        </div>
      ))}
      {/* Fill empty slots in the last row */}
      {rowPackages.length < itemsPerRow &&
        Array.from({ length: itemsPerRow - rowPackages.length }).map((_, i) => (
          <div key={`empty-${i}`} className="flex-1" />
        ))}
    </div>
  );
};

// List item component for virtualized rendering
const ListItem = ({
  index,
  style,
  packages,
  onInstall,
  onUninstall,
  onUpdate,
  packageType,
  setItemRef,
}: RowComponentProps<{
  packages: EnhancedBrewPackage[];
  onInstall?: (name: string, packageType: "formula" | "cask") => void;
  onUninstall?: (name: string, packageType: "formula" | "cask") => void;
  onUpdate?: (name: string, packageType: "formula" | "cask") => void;
  onPackageClick?: (pkg: EnhancedBrewPackage) => void;
  packageType: "formula" | "cask";
  setItemRef: (index: number, element: HTMLDivElement | null) => void;
}>) => {
  const pkg = packages[index];

  if (!pkg) {
    return <div style={style} />;
  }

  return (
    <div style={style} ref={(el) => setItemRef(index, el)}>
      <PackageCard
        pkg={pkg}
        onInstall={onInstall}
        onUninstall={onUninstall}
        onUpdate={onUpdate}
        packageType={packageType}
      />
    </div>
  );
};

// Keyboard navigation hook
const useKeyboardNavigation = (
  listRef: React.RefObject<any>,
  itemCount: number,
  itemsPerRow: number = 1
) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!listRef.current) return;

      let newIndex = focusedIndex;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          newIndex = Math.min(focusedIndex + itemsPerRow, itemCount - 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          newIndex = Math.max(focusedIndex - itemsPerRow, 0);
          break;
        case "ArrowLeft":
          if (itemsPerRow > 1) {
            event.preventDefault();
            newIndex = Math.max(focusedIndex - 1, 0);
          }
          break;
        case "ArrowRight":
          if (itemsPerRow > 1) {
            event.preventDefault();
            newIndex = Math.min(focusedIndex + 1, itemCount - 1);
          }
          break;
        case "Home":
          event.preventDefault();
          newIndex = 0;
          break;
        case "End":
          event.preventDefault();
          newIndex = itemCount - 1;
          break;
        case "PageDown":
          event.preventDefault();
          newIndex = Math.min(focusedIndex + itemsPerRow * 5, itemCount - 1);
          break;
        case "PageUp":
          event.preventDefault();
          newIndex = Math.max(focusedIndex - itemsPerRow * 5, 0);
          break;
        default:
          return;
      }

      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex);
        // Scroll to the focused item
        if (listRef.current.scrollToRow) {
          if (itemsPerRow > 1) {
            listRef.current.scrollToRow({
              index: Math.floor(newIndex / itemsPerRow),
              align: "smart",
            });
          } else {
            listRef.current.scrollToRow({
              index: newIndex,
              align: "smart",
            });
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, itemCount, itemsPerRow, listRef]);

  return { focusedIndex, setFocusedIndex };
};

export const VirtualizedPackageList: React.FC<VirtualizedPackageListProps> = ({
  packages,
  loading = false,
  onInstall,
  onUninstall,
  onUpdate,
  packageType = "formula",
  viewMode = "grid",
  density = "comfortable",
  className = "",
  height = 600,
  itemsPerRow = 2,
}) => {
  const listRef = useListRef(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate responsive items per row for grid mode
  const [responsiveItemsPerRow, setResponsiveItemsPerRow] =
    useState(itemsPerRow);

  useEffect(() => {
    const updateItemsPerRow = () => {
      if (!containerRef.current || viewMode === "list") return;

      const containerWidth = containerRef.current.offsetWidth;
      const minItemWidth =
        density === "compact" ? 300 : density === "spacious" ? 500 : 400;
      const gap = density === "compact" ? 16 : density === "spacious" ? 32 : 24;

      const calculatedItemsPerRow = Math.max(
        1,
        Math.floor((containerWidth + gap) / (minItemWidth + gap))
      );
      setResponsiveItemsPerRow(calculatedItemsPerRow);
    };

    updateItemsPerRow();
    window.addEventListener("resize", updateItemsPerRow);
    return () => window.removeEventListener("resize", updateItemsPerRow);
  }, [density, viewMode]);

  // Dynamic height calculation
  const { getItemHeight, setItemRef } = useDynamicItemHeight(
    packages,
    density,
    viewMode
  );

  // Keyboard navigation
  const actualItemsPerRow = viewMode === "list" ? 1 : responsiveItemsPerRow;
  const itemCount =
    viewMode === "list"
      ? packages.length
      : Math.ceil(packages.length / actualItemsPerRow);

  useKeyboardNavigation(listRef, itemCount, actualItemsPerRow);

  // Memoized row props to prevent unnecessary re-renders
  const rowProps = useMemo(
    () => ({
      packages,
      itemsPerRow: actualItemsPerRow,
      onInstall,
      onUninstall,
      onUpdate,
      packageType,
      density,
      setItemRef,
    }),
    [
      packages,
      actualItemsPerRow,
      onInstall,
      onUninstall,
      onUpdate,
      packageType,
      density,
      setItemRef,
    ]
  );

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <PackageCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Empty state
  if (packages.length === 0) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📦</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No packages found
        </h3>
        <p className="text-muted-foreground">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${className}`}
      tabIndex={0}
      role="grid"
      aria-label={`Package list with ${packages.length} items`}
    >
      {viewMode === "list" ? (
        <List
          listRef={listRef}
          rowComponent={ListItem}
          rowCount={packages.length}
          rowHeight={getItemHeight}
          rowProps={rowProps}
          overscanCount={5}
          className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ height }}
        />
      ) : (
        <List
          listRef={listRef}
          rowComponent={GridItem}
          rowCount={itemCount}
          rowHeight={getItemHeight}
          rowProps={rowProps}
          overscanCount={2}
          className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ height }}
        />
      )}
    </div>
  );
};

export default VirtualizedPackageList;
