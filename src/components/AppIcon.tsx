import { useState, useEffect, useMemo } from "react";
import { FiPackage } from "react-icons/fi";

interface AppIconProps {
  packageName: string;
  description: string;
}

// Icon cache management
const iconCache = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(`icon_${key}`);
    } catch {
      return null;
    }
  },
  set: (key: string, url: string): void => {
    try {
      localStorage.setItem(`icon_${key}`, url);
    } catch {
      // Ignore storage errors
    }
  },
  has: (key: string): boolean => {
    return iconCache.get(key) !== null;
  },
};

export const AppIcon = ({ packageName, description }: AppIconProps) => {
  const [iconState, setIconState] = useState<
    "loading" | "loaded" | "fallback" | "failed"
  >("loading");
  const [currentSrc, setCurrentSrc] = useState<string>("");

  const iconUrls = useMemo(() => {
    const primaryUrl = `https://github.com/App-Fair/appcasks/releases/download/cask-${packageName}/AppIcon.png`;
    const homepage = description.includes("homepage")
      ? description.split("homepage:")[1]?.split(" ")[0]
      : packageName;
    const fallbackUrl = `https://icon.horse/icon/${homepage}`;

    return { primaryUrl, fallbackUrl };
  }, [packageName, description]);

  useEffect(() => {
    // Check cache first
    const cachedUrl = iconCache.get(packageName);
    if (cachedUrl) {
      setCurrentSrc(cachedUrl);
      setIconState("loaded");
      return;
    }

    // Try primary URL
    setCurrentSrc(iconUrls.primaryUrl);
    setIconState("loading");
  }, [packageName, iconUrls]);

  const handleImageLoad = () => {
    setIconState("loaded");
    iconCache.set(packageName, currentSrc);
  };

  const handleImageError = () => {
    if (currentSrc === iconUrls.primaryUrl) {
      // Try fallback URL
      setCurrentSrc(iconUrls.fallbackUrl);
      setIconState("loading");
    } else {
      // Both failed
      setIconState("failed");
    }
  };

  if (iconState === "failed") {
    return (
      <div className="w-16 h-16 bg-gradient-to-br from-muted via-secondary to-primary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/15 border border-white/40">
        <FiPackage className="w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0">
      {iconState === "loading" && (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted via-secondary to-primary animate-pulse shadow-lg shadow-primary/15"></div>
      )}
      <img
        src={currentSrc}
        alt={`${packageName} icon`}
        className={`w-16 h-16 rounded-2xl object-cover bg-white shadow-lg shadow-primary/15 border border-white/40 ${
          iconState === "loading" ? "opacity-0" : ""
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ display: iconState === "loading" ? "none" : "block" }}
      />
    </div>
  );
};
