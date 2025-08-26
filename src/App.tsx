import { useState, useEffect, useMemo } from "react";
import { 
  FiSearch, 
  FiPackage, 
  FiDownload, 
  FiTrash2, 
  FiRefreshCw, 
  FiHome, 
  FiGrid,
} from "react-icons/fi";
import { useBrewStore, type BrewPackage } from "./stores/brewStore";
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
    return <FiPackage className="package-icon-fallback" />;
  }

  return (
    <div className="package-icon-container">
      {iconState === 'loading' && (
        <div className="package-icon-skeleton shimmer"></div>
      )}
      <img 
        src={currentSrc}
        alt={`${packageName} icon`}
        className={`package-icon ${iconState === 'loading' ? 'loading' : ''}`}
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

  const renderPackageCard = (pkg: BrewPackage, isSearchResult = false) => (
    <div key={pkg.name} className="package-card">
      <div className="package-header">
        <AppIcon packageName={pkg.name} description={pkg.description} />
        <div className="package-info">
          <h3>{pkg.name}</h3>
          <p className="package-version">v{pkg.version}</p>
          <p className="package-description">{pkg.description}</p>
        </div>
      </div>
      <div className="package-status">
        {pkg.installed && <span className="status-badge installed">Installed</span>}
        {pkg.outdated && <span className="status-badge outdated">Outdated</span>}
      </div>
      <div className="package-actions">
        {!pkg.installed && (isSearchResult || activeTab === "discover") && (
          <button
            onClick={() => installPackage(pkg.name)}
            disabled={loading}
            className="btn btn-primary"
          >
            <FiDownload size={16} />
            Install
          </button>
        )}
        {pkg.installed && (
          <>
            {pkg.outdated && (
              <button
                onClick={() => updatePackage(pkg.name)}
                disabled={loading}
                className="btn btn-secondary"
              >
                <FiRefreshCw size={16} />
                Update
              </button>
            )}
            <button
              onClick={() => uninstallPackage(pkg.name)}
              disabled={loading}
              className="btn btn-danger"
            >
              <FiTrash2 size={16} />
              Uninstall
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderCategoryCard = (category: Category) => (
    <div key={category.id} className="category-card">
      <div className="category-header">
        <FiGrid className="category-icon" />
        <div className="category-info">
          <h3>{category.id}</h3>
          <p>{category.casks.length} apps</p>
        </div>
      </div>
      <div className="category-actions">
        <button
          onClick={() => {
            setActiveType("cask");
            setActiveTab("search");
            setSearchQuery(category.id.toLowerCase());
            searchPackages(category.id.toLowerCase());
          }}
          className="btn btn-primary"
        >
          Browse Apps
        </button>
      </div>
    </div>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <FiHome size={24} />
            <h1>BrewDeck</h1>
          </div>
          <div className="header-actions">
            {brewInfo && brewInfo.total_outdated > 0 && (
              <button
                onClick={updateAllPackages}
                disabled={loading}
                className="btn btn-secondary"
              >
                <FiRefreshCw size={16} />
                Update All ({brewInfo.total_outdated})
              </button>
            )}
            <button onClick={loadBrewInfo} disabled={loading} className="btn btn-secondary">
              <FiRefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <div className="type-switch">
          <button
            className={`nav-tab ${activeType === "formula" ? "active" : ""}`}
            onClick={() => setActiveType("formula")}
          >
            Formulae
          </button>
          <button
            className={`nav-tab ${activeType === "cask" ? "active" : ""}`}
            onClick={() => setActiveType("cask")}
          >
            Casks
          </button>
        </div>
        <div className="tab-switch">
          <button
            className={`nav-tab ${activeTab === "installed" ? "active" : ""}`}
            onClick={() => setActiveTab("installed")}
          >
            <FiPackage size={16} />
            Installed ({brewInfo?.total_installed || 0})
          </button>
          <button
            className={`nav-tab ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            <FiSearch size={16} />
            Search
          </button>
          <button
            className={`nav-tab ${activeTab === "discover" ? "active" : ""}`}
            onClick={() => setActiveTab("discover")}
          >
            <FiGrid size={16} />
            Discover
          </button>
        </div>
      </nav>

      <main className="app-main">
        {message && (
          <div className="message">
            {message}
            <button onClick={clearMessage} className="message-close">×</button>
          </div>
        )}

        {activeTab === "search" && (
          <div className="search-section">
            <div className="search-box">
              <FiSearch size={20} />
              <input
                type="text"
                placeholder={`Search for ${activeType === "formula" ? "packages" : "apps"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button onClick={handleSearch} disabled={loading} className="btn btn-primary">
                Search
              </button>
            </div>
            <div className="search-results">
              {searchResults.map((pkg) => renderPackageCard(pkg, true))}
            </div>
          </div>
        )}

        {activeTab === "installed" && (
          <div className="installed-section">
            {loading ? (
              <div className="loading">Loading packages...</div>
            ) : brewInfo ? (
              <div className="packages-grid">
                {brewInfo.packages.map((pkg) => renderPackageCard(pkg))}
              </div>
            ) : (
              <div className="empty-state">
                <FiPackage size={48} />
                <h2>No packages found</h2>
                <p>Make sure Homebrew is installed and try refreshing.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "discover" && (
          <div className="discover-section">
            <div className="categories-grid">
              {categories.map((category) => renderCategoryCard(category))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
