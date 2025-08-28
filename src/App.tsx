import { useState, useEffect, useMemo } from "react";
import { 
  FiSearch, 
  FiPackage, 
  FiDownload, 
  FiTrash2, 
  FiRefreshCw, 
  FiHome, 
  FiGrid,
  FiExternalLink,
} from "react-icons/fi";
import { useBrewStore, type BrewPackage } from "./stores/brewStore";
import { openUrl } from '@tauri-apps/plugin-opener';
import "./App.css";


interface Category {
  id: string;
  sfSymbol: string;
  casks: string[];
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
  }
};

// Loading skeleton component
const PackageCardSkeleton = () => (
  <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/40 shadow-lg shadow-slate-200/20">
    <div className="flex items-start gap-5">
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-2xl animate-pulse"></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-3">
          <div className="h-7 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-32 animate-pulse"></div>
          <div className="w-24 h-10 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-2xl animate-pulse"></div>
        </div>
        <div className="h-5 bg-slate-200 rounded-lg mb-2 w-full animate-pulse"></div>
        <div className="h-5 bg-slate-200 rounded-lg mb-4 w-3/4 animate-pulse"></div>
        <div className="flex gap-3">
          <div className="h-8 w-20 bg-slate-200 rounded-xl animate-pulse"></div>
          <div className="h-8 w-24 bg-green-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

// Icon loading component with cache and fallback
const AppIcon = ({ packageName, description }: { packageName: string; description: string }) => {
  const [iconState, setIconState] = useState<'loading' | 'loaded' | 'fallback' | 'failed'>('loading');
  const [currentSrc, setCurrentSrc] = useState<string>('');

  const iconUrls = useMemo(() => {
    const primaryUrl = `https://github.com/App-Fair/appcasks/releases/download/cask-${packageName}/AppIcon.png`;
    const homepage = description.includes('homepage') ? 
      description.split('homepage:')[1]?.split(' ')[0] : 
      packageName;
    const fallbackUrl = `https://icon.horse/icon/${homepage}`;
    
    return { primaryUrl, fallbackUrl };
  }, [packageName, description]);

  useEffect(() => {
    // Check cache first
    const cachedUrl = iconCache.get(packageName);
    if (cachedUrl) {
      setCurrentSrc(cachedUrl);
      setIconState('loaded');
      return;
    }

    // Try primary URL
    setCurrentSrc(iconUrls.primaryUrl);
    setIconState('loading');
  }, [packageName, iconUrls]);

  const handleImageLoad = () => {
    setIconState('loaded');
    iconCache.set(packageName, currentSrc);
  };

  const handleImageError = () => {
    if (currentSrc === iconUrls.primaryUrl) {
      // Try fallback URL
      setCurrentSrc(iconUrls.fallbackUrl);
      setIconState('loading');
    } else {
      // Both failed
      setIconState('failed');
    }
  };

  if (iconState === 'failed') {
    return (
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-indigo-500/20 border border-white/40">
        <FiPackage className="w-8 h-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0">
      {iconState === 'loading' && (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-200 via-purple-200 to-blue-200 animate-pulse shadow-xl shadow-indigo-500/20"></div>
      )}
      <img 
        src={currentSrc}
        alt={`${packageName} icon`}
        className={`w-16 h-16 rounded-2xl object-cover bg-white shadow-xl shadow-indigo-500/20 border border-white/40 ${iconState === 'loading' ? 'opacity-0' : ''}`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ display: iconState === 'loading' ? 'none' : 'block' }}
      />
    </div>
  );
};

// Import categories from Applite
const categories: Category[] = [
  {
    "id": "Browsers",
    "sfSymbol": "network",
    "casks": [
      "arc", "brave-browser", "firefox", "google-chrome", "librewolf",
      "microsoft-edge", "opera", "opera-gx", "orion", "tor-browser",
      "vivaldi", "zen-browser"
    ]
  },
  {
    "id": "Communication",
    "sfSymbol": "text.bubble",
    "casks": [
      "beeper", "discord", "messenger", "microsoft-teams", "signal",
      "telegram-desktop", "threema@beta", "viber", "wechat", "whatsapp", "zoom"
    ]
  },
  {
    "id": "Productivity",
    "sfSymbol": "gauge.high",
    "casks": [
      "alt-tab", "antinote", "bettertouchtool", "cleanshot", "evernote",
      "fantastical", "hazel", "hazeover", "maccy", "notion", "numi",
      "obsidian", "pastebot", "raycast", "rectangle", "shottr",
      "soulver", "unclutter"
    ]
  },
  {
    "id": "Office Tools",
    "sfSymbol": "doc.text",
    "casks": [
      "asana", "dropbox", "libreoffice", "microsoft-excel", "microsoft-outlook",
      "microsoft-powerpoint", "microsoft-teams", "microsoft-word", "onedrive",
      "onlyoffice", "openoffice", "slack"
    ]
  },
  {
    "id": "Menu Bar",
    "sfSymbol": "menubar.rectangle",
    "casks": [
      "airbuddy", "badgeify", "bartender", "caffeine", "coconutbattery",
      "flux", "hiddenbar", "hot", "istat-menus", "itsycal", "jordanbaird-ice",
      "meetingbar", "stats", "ticktick", "tomatobar", "vanilla"
    ]
  },
  {
    "id": "Utilities",
    "sfSymbol": "wrench.and.screwdriver",
    "casks": [
      "adobe-acrobat-reader", "altserver", "android-file-transfer", "balenaetcher",
      "calibre", "downie", "fing", "handbrake", "imageoptim", "keepingyouawake",
      "localsend", "obs", "pdf-expert", "permute", "pika", "raspberry-pi-imager",
      "syncthing-app", "the-unarchiver", "transmission", "upscayl"
    ]
  },
  {
    "id": "Maintenance",
    "sfSymbol": "wrench.adjustable",
    "casks": [
      "appcleaner", "daisydisk", "grandperspective", "latest", "neo-network-utility",
      "omnidisksweeper", "onyx", "pearcleaner"
    ]
  },
  {
    "id": "Creative Tools",
    "sfSymbol": "paintbrush.pointed",
    "casks": [
      "acron", "adobe-creative-cloud", "affinity-designer", "affinity-photo",
      "affinity-publisher", "audacity", "blender", "figma", "freecad", "gamemaker",
      "gimp", "godot", "inkscape", "kdenlive", "krita", "scribus", "sketch", "unity"
    ]
  },
  {
    "id": "Media",
    "sfSymbol": "play.tv",
    "casks": [
      "iina", "jellyfin-media-player", "kodi", "netnewswire", "plex", "spotify",
      "tidal", "vlc"
    ]
  },
  {
    "id": "Developer Tools",
    "sfSymbol": "desktopcomputer",
    "casks": [
      "android-studio", "dash", "docker", "fork", "forklift", "github", "gitkraken",
      "jetbrains-toolbox", "kaleidoscope", "postman", "rapidapi", "ssh-config-editor",
      "tower", "transmit", "xcodes"
    ]
  },
  {
    "id": "IDEs",
    "sfSymbol": "chevron.left.slash.chevron.right",
    "casks": [
      "clion", "cursor", "dataspell", "goland", "intellij-idea", "intellij-idea-ce",
      "nova", "phpstorm", "pycharm", "pycharm-ce", "rider", "rubymine",
      "sublime-text", "textmate", "visual-studio-code", "vscodium", "zed"
    ]
  },
  {
    "id": "Terminals",
    "sfSymbol": "terminal",
    "casks": [
      "alacritty", "ghostty", "hyper", "iterm2", "kitty", "tabby", "warp", "wezterm", "zoc"
    ]
  },
  {
    "id": "Virtualization",
    "sfSymbol": "shippingbox",
    "casks": [
      "multipass", "parallels", "utm", "virtualbox", "vmware-fusion"
    ]
  },
  {
    "id": "Gaming",
    "sfSymbol": "gamecontroller",
    "casks": [
      "battle-net", "chiaki", "epic-games", "gog-galaxy", "league-of-legends",
      "minecraft", "modrinth", "openemu", "prismlauncher", "steam",
      "the-battle-for-wesnoth", "widelands"
    ]
  },
  {
    "id": "VPN",
    "sfSymbol": "externaldrive.badge.icloud",
    "casks": [
      "cloudflare-warp", "cyberghost-vpn", "nordvpn", "openvpn-connect",
      "protonvpn", "tunnelbear"
    ]
  },
  {
    "id": "Password Managers",
    "sfSymbol": "lock.square",
    "casks": [
      "1password", "bitwarden", "enpass", "keepassxc", "keeper-password-manager",
      "lastpass", "nordpass", "roboform"
    ]
  }
];

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
    updateAllPackages
  } = useBrewStore();

  // Load initial data
  useEffect(() => {
    if (activeTab !== 'discover') {
      loadBrewInfo();
    }
  }, []);

  const handleSearch = () => {
    searchPackages(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const renderPackageCard = (pkg: BrewPackage, isSearchResult = false) => {
    const handleCardClick = async (e: React.MouseEvent) => {
      // 阻止事件冒泡，避免触发按钮的点击事件
      e.stopPropagation();
      
      // 如果包有homepage，则打开官网
      if (pkg.homepage && pkg.homepage.trim() !== '') {
        // 确保URL有协议前缀
        let url = pkg.homepage.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        console.log('Opening homepage:', url);
        try {
          await openUrl(url);
        } catch (error) {
          console.error('Failed to open URL with Tauri opener:', error);
          // 如果 Tauri opener 失败，尝试使用 window.open 作为后备
          try {
            window.open(url, '_blank');
          } catch (windowError) {
            console.error('Failed to open URL with window.open:', windowError);
          }
        }
      } else {
        console.log('No homepage available for:', pkg.name);
      }
    };

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
      e.stopPropagation();
      action();
    };

    const hasHomepage = pkg.homepage && pkg.homepage.trim() !== '';
    
    return (
      <div 
        key={pkg.name} 
        className={`group relative bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/40 shadow-lg shadow-slate-200/20 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 hover:border-indigo-200/50 ${hasHomepage ? 'cursor-pointer' : ''}`}
        onClick={handleCardClick}
      >
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-white/20 to-purple-50/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative z-10">
          <div className="flex items-start gap-5">
            <div className="relative flex-shrink-0">
              <AppIcon packageName={pkg.name} description={pkg.description} />
              {pkg.installed && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
              {pkg.outdated && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-400 to-red-500 rounded-full border-2 border-white shadow-md animate-pulse"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors duration-300">
                    {pkg.name}
                  </h3>
                  {pkg.homepage && pkg.homepage.trim() !== '' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <FiExternalLink size={12} className="text-blue-600" />
                      <span className="text-xs text-blue-600 font-medium">Visit</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  {!pkg.installed && (isSearchResult || activeTab === "discover") && (
                    <button
                      onClick={(e) => handleActionClick(e, () => installPackage(pkg.name))}
                      disabled={loading}
                      className="group/btn relative inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl font-semibold shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <FiDownload size={16} className="group-hover/btn:scale-110 transition-transform duration-200" />
                      <span>Install</span>
                      <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                    </button>
                  )}
                  {pkg.installed && (
                    <div className="flex flex-col gap-2">
                      {pkg.outdated && (
                        <button
                          onClick={(e) => handleActionClick(e, () => updatePackage(pkg.name))}
                          disabled={loading}
                          className="group/btn relative inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white rounded-2xl font-semibold shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                          <FiRefreshCw size={16} className="group-hover/btn:rotate-180 transition-transform duration-300" />
                          <span>Update</span>
                          <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        </button>
                      )}
                      <button
                        onClick={(e) => handleActionClick(e, () => uninstallPackage(pkg.name))}
                        disabled={loading}
                        className="group/btn inline-flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:bg-red-50 hover:border-red-200 hover:text-red-700 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiTrash2 size={16} className="group-hover/btn:scale-110 transition-transform duration-200" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-slate-600 leading-relaxed mb-4 line-clamp-2 group-hover:text-slate-700 transition-colors duration-300">
                {pkg.description}
              </p>
              
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500">VERSION</span>
                  <span className="text-sm font-bold text-slate-700">{pkg.version}</span>
                </div>
                {pkg.installed && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-xl border border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold text-green-700">Installed</span>
                  </div>
                )}
                {pkg.outdated && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 rounded-xl border border-orange-200">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold text-orange-700">Update Available</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getCategoryIcon = (categoryId: string) => {
    const iconMap: Record<string, string> = {
      "Browsers": "🌐",
      "Communication": "💬",
      "Productivity": "⚡",
      "Office Tools": "📄",
      "Menu Bar": "📋",
      "Utilities": "🔧",
      "Maintenance": "🧹",
      "Creative Tools": "🎨",
      "Media": "🎵",
      "Developer Tools": "👨‍💻",
      "IDEs": "💻",
      "Terminals": "⌨️",
      "Virtualization": "📦",
      "Gaming": "🎮",
      "VPN": "🔒",
      "Password Managers": "🔐"
    };
    return iconMap[categoryId] || "📱";
  };

  const renderCategoryCard = (category: Category) => (
    <div 
      key={category.id} 
      className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/40 shadow-lg shadow-slate-200/20 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-3 hover:border-indigo-200/50 cursor-pointer overflow-hidden"
      onClick={() => {
        setActiveType("cask");
        setActiveTab("search");
        setSearchQuery(category.id.toLowerCase());
        searchPackages(category.id.toLowerCase());
      }}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-blue-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <div className="flex items-start gap-6 mb-6">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              {getCategoryIcon(category.id)}
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
              {category.casks.length}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors duration-300">
              {category.id}
            </h3>
            <p className="text-slate-500 font-medium">{category.casks.length} applications available</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {category.casks.slice(0, 4).map((cask, index) => (
              <div 
                key={cask}
                className="w-8 h-8 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full border-3 border-white flex items-center justify-center text-sm font-bold text-indigo-700 shadow-lg group-hover:scale-110 transition-all duration-300"
                style={{ 
                  zIndex: 4 - index,
                  transitionDelay: `${index * 50}ms`
                }}
              >
                {cask.charAt(0).toUpperCase()}
              </div>
            ))}
            {category.casks.length > 4 && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full border-3 border-white flex items-center justify-center text-sm font-bold text-white shadow-lg group-hover:scale-110 transition-all duration-300">
                +{category.casks.length - 4}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-200 group-hover:bg-indigo-100 transition-all duration-300">
            <span className="text-indigo-700 font-semibold">Explore</span>
            <FiExternalLink size={16} className="text-indigo-600 group-hover:translate-x-1 group-hover:scale-110 transition-all duration-300" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <header className="bg-white/70 backdrop-blur-2xl border-b border-white/20 shadow-lg shadow-indigo-500/5">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/25">
                  <FiHome size={24} className="text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  BrewDeck
                </h1>
                <p className="text-slate-500 font-medium">Modern Homebrew Package Manager</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {brewInfo && brewInfo.total_outdated > 0 && (
                <button
                  onClick={updateAllPackages}
                  disabled={loading}
                  className="group relative inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white rounded-2xl font-semibold shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <FiRefreshCw size={18} className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-300"} />
                  <span>Update All ({brewInfo.total_outdated})</span>
                  <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              )}
              <button 
                onClick={loadBrewInfo} 
                disabled={loading} 
                className="group inline-flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm border border-white/40 text-slate-700 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:bg-white/90 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiRefreshCw size={18} className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-300"} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white/50 backdrop-blur-2xl border-b border-white/30">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between py-4 border-b border-white/30">
            <div className="flex items-center gap-2">
              <button
                className={`group relative px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                  activeType === "formula" 
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/25" 
                    : "text-slate-600 hover:text-slate-800 hover:bg-white/60"
                }`}
                onClick={() => setActiveType("formula")}
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
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/25" 
                    : "text-slate-600 hover:text-slate-800 hover:bg-white/60"
                }`}
                onClick={() => setActiveType("cask")}
              >
                <span className="relative z-10 flex items-center gap-2">
                  🖥️ <span>Applications</span>
                </span>
                {activeType === "cask" && (
                  <div className="absolute inset-0 bg-white/20 rounded-2xl"></div>
                )}
              </button>
            </div>
            {brewInfo && (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-200">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700 font-semibold">{brewInfo.total_installed} installed</span>
                </div>
                {brewInfo.total_outdated > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-orange-700 font-semibold">{brewInfo.total_outdated} updates</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 py-4">
            <button
              className={`group relative inline-flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                activeTab === "installed" 
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/25" 
                  : "text-slate-600 hover:text-slate-800 hover:bg-white/60"
              }`}
              onClick={() => setActiveTab("installed")}
            >
              <FiPackage size={18} />
              <span>Installed</span>
              {brewInfo?.total_installed && (
                <span className={`px-3 py-1 rounded-xl text-sm font-bold ${
                  activeTab === "installed" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {brewInfo.total_installed}
                </span>
              )}
              {activeTab === "installed" && (
                <div className="absolute inset-0 bg-white/10 rounded-2xl"></div>
              )}
            </button>
            <button
              className={`group relative inline-flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                activeTab === "search" 
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/25" 
                  : "text-slate-600 hover:text-slate-800 hover:bg-white/60"
              }`}
              onClick={() => setActiveTab("search")}
            >
              <FiSearch size={18} />
              <span>Search</span>
              {activeTab === "search" && (
                <div className="absolute inset-0 bg-white/10 rounded-2xl"></div>
              )}
            </button>
            <button
              className={`group relative inline-flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                activeTab === "discover" 
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/25" 
                  : "text-slate-600 hover:text-slate-800 hover:bg-white/60"
              }`}
              onClick={() => setActiveTab("discover")}
            >
              <FiGrid size={18} />
              <span>Discover</span>
              {activeTab === "discover" && (
                <div className="absolute inset-0 bg-white/10 rounded-2xl"></div>
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {message && (
          <div className="relative mb-8 p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50 rounded-3xl shadow-lg shadow-blue-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-blue-800 font-medium">{message}</span>
              </div>
              <button 
                onClick={clearMessage} 
                className="w-8 h-8 flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-xl transition-all duration-200 font-bold"
              >
                ×
              </button>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 to-indigo-400/5 rounded-3xl"></div>
          </div>
        )}

        {activeTab === "search" && (
          <div className="flex flex-col gap-6">
            <div className="relative mb-8">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <FiSearch size={24} className="text-indigo-400" />
              </div>
              <input
                type="text"
                placeholder={`Search for ${activeType === "formula" ? "packages" : "applications"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-16 pr-40 py-6 bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl text-slate-800 placeholder:text-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all duration-300 shadow-xl shadow-indigo-500/10 text-lg font-medium"
              />
              <button 
                onClick={handleSearch} 
                disabled={loading} 
                className="absolute inset-y-0 right-0 mr-3 my-3 px-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white rounded-2xl font-semibold shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <FiRefreshCw size={20} className="animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Search</span>
                    <FiSearch size={18} />
                  </span>
                )}
              </button>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {Array.from({ length: 4 }).map((_, index) => (
                  <PackageCardSkeleton key={index} />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {searchResults.map((pkg) => renderPackageCard(pkg, true))}
              </div>
            ) : searchQuery && !loading ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiSearch size={24} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">No results found</h3>
                <p className="text-slate-500">Try adjusting your search terms or browse categories instead.</p>
              </div>
            ) : !searchQuery ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiSearch size={24} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Search for packages</h3>
                <p className="text-slate-500">Enter a package name or keyword to get started.</p>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === "installed" && (
          <div className="flex flex-col gap-6">
            {loading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {Array.from({ length: 6 }).map((_, index) => (
                  <PackageCardSkeleton key={index} />
                ))}
              </div>
            ) : brewInfo && brewInfo.packages.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-800">
                    Installed {activeType === "formula" ? "Packages" : "Applications"}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {brewInfo.total_installed} total
                    </span>
                    {brewInfo.total_outdated > 0 && (
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        {brewInfo.total_outdated} outdated
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {brewInfo.packages.map((pkg) => renderPackageCard(pkg))}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 float-animation">
                    <FiPackage size={32} className="text-blue-600" />
                  </div>
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-blue-500/10 rounded-full animate-ping"></div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">No packages installed</h3>
                <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                  {activeType === "formula" 
                    ? "Start your journey by installing some useful command-line tools and packages." 
                    : "Discover amazing applications and install them with just one click."
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setActiveTab("discover")}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                  >
                    <FiGrid size={16} />
                    Discover Apps
                  </button>
                  <button
                    onClick={() => setActiveTab("search")}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200"
                  >
                    <FiSearch size={16} />
                    Search Packages
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "discover" && (
          <div className="flex flex-col gap-6">
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
                Browse our curated collection of categories to find the perfect applications for your workflow
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {categories.map((category) => renderCategoryCard(category))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
