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
    return <FiPackage className="w-[54px] h-[54px] text-[#3E3F29] flex-shrink-0" />;
  }

  return (
    <div className="relative flex-shrink-0">
      {iconState === 'loading' && (
        <div className="w-[54px] h-[54px] rounded-lg shimmer"></div>
      )}
      <img 
        src={currentSrc}
        alt={`${packageName} icon`}
        className={`w-[54px] h-[54px] rounded-lg object-cover bg-[#F1F0E4] border border-[#BCA88D] ${iconState === 'loading' ? 'opacity-0' : ''}`}
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
        className={`bg-[#F1F0E4] rounded-xl p-4 shadow-sm border border-[#BCA88D] transition-all duration-200 h-[90px] flex items-center ${hasHomepage ? 'hover:shadow-md hover:-translate-y-1 hover:border-[#7D8D86] cursor-pointer' : 'hover:shadow-md hover:-translate-y-1'}`}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between w-full h-full">
          <div className="flex items-center gap-4 flex-1 h-full">
            <AppIcon packageName={pkg.name} description={pkg.description} />
            <div className="flex flex-col justify-center h-full">
              <h3 className="text-base font-semibold text-[#3E3F29] mb-1 leading-tight">{pkg.name}</h3>
              <p className="text-sm text-[#7D8D86] leading-tight mb-1 line-clamp-2 max-h-[2.4em]">{pkg.description}</p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-xs text-[#7D8D86] mb-0.5">v{pkg.version}</span>
                {pkg.installed && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#BCA88D] text-[#3E3F29]">Installed</span>}
                {pkg.outdated && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#7D8D86] text-[#F1F0E4]">Outdated</span>}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end justify-center gap-2 h-full">
            {pkg.homepage && pkg.homepage.trim() !== '' && (
              <div className="flex items-center gap-1 text-xs text-[#BCA88D] italic mb-2">
                <FiExternalLink size={14} className="text-[#7D8D86]" />
                <span>Homepage</span>
              </div>
            )}
            <div className="flex gap-2 flex-wrap mt-1">
              {!pkg.installed && (isSearchResult || activeTab === "discover") && (
                <button
                  onClick={(e) => handleActionClick(e, () => installPackage(pkg.name))}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-2 py-1 border-none rounded-md text-xs font-medium cursor-pointer transition-all duration-200 bg-[#3E3F29] text-[#F1F0E4] hover:bg-[#7D8D86] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiDownload size={16} />
                  Install
                </button>
              )}
              {pkg.installed && (
                <>
                  {pkg.outdated && (
                    <button
                      onClick={(e) => handleActionClick(e, () => updatePackage(pkg.name))}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-2 py-1 border border-[#7D8D86] rounded-md text-xs font-medium cursor-pointer transition-all duration-200 bg-[#BCA88D] text-[#3E3F29] hover:bg-[#7D8D86] hover:text-[#F1F0E4] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiRefreshCw size={16} />
                      Update
                    </button>
                  )}
                  <button
                    onClick={(e) => handleActionClick(e, () => uninstallPackage(pkg.name))}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-2 py-1 border-none rounded-md text-xs font-medium cursor-pointer transition-all duration-200 bg-[#7D8D86] text-[#F1F0E4] hover:bg-[#3E3F29] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiTrash2 size={16} />
                    Uninstall
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryCard = (category: Category) => (
    <div key={category.id} className="bg-[#F1F0E4] rounded-xl p-6 shadow-sm border border-[#BCA88D] transition-all duration-200 flex flex-col justify-between min-h-[120px] hover:shadow-md hover:-translate-y-1">
      <div className="flex items-start gap-4 mb-4">
        <FiGrid className="text-[#3E3F29] flex-shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-[#3E3F29] mb-1">{category.id}</h3>
          <p className="text-sm text-[#7D8D86]">{category.casks.length} apps</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => {
            setActiveType("cask");
            setActiveTab("search");
            setSearchQuery(category.id.toLowerCase());
            searchPackages(category.id.toLowerCase());
          }}
          className="inline-flex items-center gap-2 px-4 py-2 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 bg-[#3E3F29] text-[#F1F0E4] hover:bg-[#7D8D86]"
        >
          Browse Apps
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-br from-[#3E3F29] to-[#7D8D86] text-[#F1F0E4] p-4 shadow-lg">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <FiHome size={24} />
            <h1 className="text-2xl font-semibold">BrewDeck</h1>
          </div>
          <div className="flex gap-3">
            {brewInfo && brewInfo.total_outdated > 0 && (
              <button
                onClick={updateAllPackages}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[#7D8D86] rounded-md text-sm font-medium cursor-pointer transition-all duration-200 bg-[#BCA88D] text-[#3E3F29] hover:bg-[#7D8D86] hover:text-[#F1F0E4] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiRefreshCw size={16} />
                Update All ({brewInfo.total_outdated})
              </button>
            )}
            <button onClick={loadBrewInfo} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 border border-[#7D8D86] rounded-md text-sm font-medium cursor-pointer transition-all duration-200 bg-[#BCA88D] text-[#3E3F29] hover:bg-[#7D8D86] hover:text-[#F1F0E4] disabled:opacity-50 disabled:cursor-not-allowed">
              <FiRefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-[#F1F0E4] border-b border-[#BCA88D] px-8 flex flex-col gap-2">
        <div className="flex border-b border-[#BCA88D]">
          <button
            className={`inline-flex items-center gap-2 px-6 py-4 bg-none border-none text-sm font-medium cursor-pointer border-b-2 border-transparent transition-all duration-200 ${activeType === "formula" ? "text-[#3E3F29] border-b-[#BCA88D]" : "text-[#7D8D86] hover:text-[#3E3F29] hover:bg-[#BCA88D]"}`}
            onClick={() => setActiveType("formula")}
          >
            Formulae
          </button>
          <button
            className={`inline-flex items-center gap-2 px-6 py-4 bg-none border-none text-sm font-medium cursor-pointer border-b-2 border-transparent transition-all duration-200 ${activeType === "cask" ? "text-[#3E3F29] border-b-[#BCA88D]" : "text-[#7D8D86] hover:text-[#3E3F29] hover:bg-[#BCA88D]"}`}
            onClick={() => setActiveType("cask")}
          >
            Casks
          </button>
        </div>
        <div className="flex">
          <button
            className={`inline-flex items-center gap-2 px-6 py-4 bg-none border-none text-sm font-medium cursor-pointer border-b-2 border-transparent transition-all duration-200 ${activeTab === "installed" ? "text-[#3E3F29] border-b-[#BCA88D]" : "text-[#7D8D86] hover:text-[#3E3F29] hover:bg-[#BCA88D]"}`}
            onClick={() => setActiveTab("installed")}
          >
            <FiPackage size={16} />
            Installed ({brewInfo?.total_installed || 0})
          </button>
          <button
            className={`inline-flex items-center gap-2 px-6 py-4 bg-none border-none text-sm font-medium cursor-pointer border-b-2 border-transparent transition-all duration-200 ${activeTab === "search" ? "text-[#3E3F29] border-b-[#BCA88D]" : "text-[#7D8D86] hover:text-[#3E3F29] hover:bg-[#BCA88D]"}`}
            onClick={() => setActiveTab("search")}
          >
            <FiSearch size={16} />
            Search
          </button>
          <button
            className={`inline-flex items-center gap-2 px-6 py-4 bg-none border-none text-sm font-medium cursor-pointer border-b-2 border-transparent transition-all duration-200 ${activeTab === "discover" ? "text-[#3E3F29] border-b-[#BCA88D]" : "text-[#7D8D86] hover:text-[#3E3F29] hover:bg-[#BCA88D]"}`}
            onClick={() => setActiveTab("discover")}
          >
            <FiGrid size={16} />
            Discover
          </button>
        </div>
      </nav>

      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {message && (
          <div className="bg-[#BCA88D] border border-[#7D8D86] text-[#3E3F29] p-4 rounded-md mb-6 flex justify-between items-center">
            {message}
            <button onClick={clearMessage} className="bg-none border-none text-[#3E3F29] text-xl cursor-pointer p-1">×</button>
          </div>
        )}

        {activeTab === "search" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 bg-[#F1F0E4] p-4 rounded-xl shadow-sm border border-[#BCA88D]">
              <FiSearch size={20} />
              <input
                type="text"
                placeholder={`Search for ${activeType === "formula" ? "packages" : "apps"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 border-none outline-none text-base text-[#3E3F29] bg-transparent placeholder:text-[#7D8D86]"
              />
              <button onClick={handleSearch} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 bg-[#3E3F29] text-[#F1F0E4] hover:bg-[#7D8D86] disabled:opacity-50 disabled:cursor-not-allowed">
                Search
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map((pkg) => renderPackageCard(pkg, true))}
            </div>
          </div>
        )}

        {activeTab === "installed" && (
          <div className="flex flex-col gap-6">
            {loading ? (
              <div className="text-center py-12 text-[#7D8D86] text-lg">Loading packages...</div>
            ) : brewInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {brewInfo.packages.map((pkg) => renderPackageCard(pkg))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#7D8D86]">
                <FiPackage size={48} className="mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-[#3E3F29] mb-2">No packages found</h2>
                <p className="text-sm">Make sure Homebrew is installed and try refreshing.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "discover" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories.map((category) => renderCategoryCard(category))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
