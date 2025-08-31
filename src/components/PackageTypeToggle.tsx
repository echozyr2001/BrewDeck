import { useEffect } from "react";

interface PackageTypeToggleProps {
  activeType: string;
  onTypeChange: (type: "formula" | "cask") => void;
  formulaeCount?: number;
  casksCount?: number;
}

export const PackageTypeToggle = ({
  activeType,
  onTypeChange,
  formulaeCount,
  casksCount,
}: PackageTypeToggleProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "2") {
        e.preventDefault();
        const type = e.key === "1" ? "formula" : "cask";
        onTypeChange(type);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "T") {
        e.preventDefault();
        onTypeChange(activeType === "formula" ? "cask" : "formula");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeType, onTypeChange]);

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
              activeType === "formula"
                ? "left-1 right-1/2 mr-0.5"
                : "left-1/2 right-1 ml-0.5"
            }`}
          />

          <button
            className={`relative z-10 flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-medium transition-all duration-300 ${
              activeType === "formula"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onTypeChange("formula")}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-sm transition-colors ${
                  activeType === "formula"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                📦
              </div>
              <span>Formulae</span>
              {formulaeCount !== undefined && (
                <div
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    activeType === "formula"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {formulaeCount}
                </div>
              )}
            </div>
          </button>

          <button
            className={`relative z-10 flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-medium transition-all duration-300 ${
              activeType === "cask"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onTypeChange("cask")}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-sm transition-colors ${
                  activeType === "cask"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                🖥️
              </div>
              <span>Applications</span>
              {casksCount !== undefined && (
                <div
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    activeType === "cask"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {casksCount}
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
