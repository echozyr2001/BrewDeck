import { useEffect } from "react";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";

interface PackageTabBarProps {
  activeTab: "formula" | "cask";
  onTabChange: (tab: "formula" | "cask") => void;
  counts: {
    formulae: number;
    casks: number;
  };
  loading: {
    formulae: boolean;
    casks: boolean;
  };
}

export const PackageTabBar = ({
  activeTab,
  onTabChange,
  counts,
  loading,
}: PackageTabBarProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "2") {
        e.preventDefault();
        const tab = e.key === "1" ? "formula" : "cask";
        onTabChange(tab);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "T") {
        e.preventDefault();
        onTabChange(activeTab === "formula" ? "cask" : "formula");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, onTabChange]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Package Type
          </h3>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            ⌘1/2 or ⌘⇧T to switch
          </div>
        </div>
      </div>

      <div className="relative bg-muted/30 p-1 rounded-xl border border-border/50">
        <div className="flex relative">
          <div
            className={`absolute top-1 bottom-1 bg-background border border-border/50 rounded-lg shadow-sm transition-all duration-300 ease-out ${
              activeTab === "formula"
                ? "left-1 right-1/2 mr-0.5"
                : "left-1/2 right-1 ml-0.5"
            }`}
          />

          <button
            className={`relative z-10 flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-medium transition-all duration-300 ${
              activeTab === "formula"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onTabChange("formula")}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-sm transition-colors ${
                  activeTab === "formula"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                📦
              </div>
              <span>Formulae</span>
              {loading.formulae ? (
                <Skeleton className="h-5 w-8 rounded-full" />
              ) : (
                <Badge
                  variant={activeTab === "formula" ? "default" : "secondary"}
                  className={`transition-colors ${
                    activeTab === "formula"
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {counts.formulae}
                </Badge>
              )}
            </div>
          </button>

          <button
            className={`relative z-10 flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-medium transition-all duration-300 ${
              activeTab === "cask"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onTabChange("cask")}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-sm transition-colors ${
                  activeTab === "cask"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                🖥️
              </div>
              <span>Applications</span>
              {loading.casks ? (
                <Skeleton className="h-5 w-8 rounded-full" />
              ) : (
                <Badge
                  variant={activeTab === "cask" ? "default" : "secondary"}
                  className={`transition-colors ${
                    activeTab === "cask"
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {counts.casks}
                </Badge>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
