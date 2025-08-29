interface PackageTypeToggleProps {
  activeType: string;
  onTypeChange: (type: "formula" | "cask") => void;
}

export const PackageTypeToggle = ({
  activeType,
  onTypeChange,
}: PackageTypeToggleProps) => (
  <div className="flex items-center gap-4">
    <button
      className={`group relative px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
        activeType === "formula"
          ? "text-slate-600 shadow-xl shadow-black-500/25"
          : "text-slate-600 hover:text-slate-800 hover:bg-white/60"
      }`}
      onClick={() => onTypeChange("formula")}
    >
      <span className="relative z-10 flex items-center gap-2">
        📦 <span>Formulae</span>
      </span>
      {activeType === "formula" && (
        <div className="absolute inset-0 bg-white/20 rounded-2xl"></div>
      )}
    </button>
    <button
      className={`group relative px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
        activeType === "cask"
          ? "text-slate-600 shadow-xl shadow-black-500/25"
          : "text-slate-600 hover:text-slate-800 hover:bg-white/60"
      }`}
      onClick={() => onTypeChange("cask")}
    >
      <span className="relative z-10 flex items-center gap-2">
        🖥️ <span>Applications</span>
      </span>
      {activeType === "cask" && (
        <div className="absolute inset-0 bg-white/20 rounded-2xl"></div>
      )}
    </button>
  </div>
);
