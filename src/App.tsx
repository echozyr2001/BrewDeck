import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  FiSearch, 
  FiPackage, 
  FiDownload, 
  FiTrash2, 
  FiRefreshCw, 
  FiHome, 
  FiGrid,
} from "react-icons/fi";
import "./App.css";

interface BrewPackage {
  name: string;
  version: string;
  description: string;
  installed: boolean;
  outdated: boolean;
}

interface BrewInfo {
  packages: BrewPackage[];
  total_installed: number;
  total_outdated: number;
}

interface Category {
  id: string;
  sfSymbol: string;
  casks: string[];
}

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
  const [brewInfo, setBrewInfo] = useState<BrewInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BrewPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"installed" | "search" | "discover">("installed");
  const [activeType, setActiveType] = useState<"formula" | "cask">("formula");

  useEffect(() => {
    if (activeTab !== "discover") {
      loadBrewInfo();
    }
  }, [activeType, activeTab]);

  const loadBrewInfo = async () => {
    setLoading(true);
    try {
      const info = await invoke<BrewInfo>(
        activeType === "formula" ? "get_brew_info" : "get_cask_info"
      );
      setBrewInfo(info);
    } catch (error) {
      setMessage(`Error loading brew info: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await invoke<BrewPackage[]>(
        activeType === "formula" ? "search_packages" : "search_casks",
        { query: searchQuery }
      );
      setSearchResults(results);
    } catch (error) {
      setMessage(`Error searching packages: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (packageName: string) => {
    setLoading(true);
    try {
      const result = await invoke<string>(
        activeType === "formula" ? "install_package" : "install_cask",
        { packageName }
      );
      setMessage(result);
      if (activeTab !== "discover") {
        await loadBrewInfo(); // Refresh the list
      }
    } catch (error) {
      setMessage(`Error installing package: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async (packageName: string) => {
    setLoading(true);
    try {
      const result = await invoke<string>(
        activeType === "formula" ? "uninstall_package" : "uninstall_cask",
        { packageName }
      );
      setMessage(result);
      if (activeTab !== "discover") {
        await loadBrewInfo(); // Refresh the list
      }
    } catch (error) {
      setMessage(`Error uninstalling package: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (packageName: string) => {
    setLoading(true);
    try {
      const result = await invoke<string>(
        activeType === "formula" ? "update_package" : "update_cask",
        { packageName }
      );
      setMessage(result);
      if (activeTab !== "discover") {
        await loadBrewInfo(); // Refresh the list
      }
    } catch (error) {
      setMessage(`Error updating package: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAll = async () => {
    setLoading(true);
    try {
      const result = await invoke<string>(
        activeType === "formula" ? "update_all_packages" : "update_all_casks"
      );
      setMessage(result);
      if (activeTab !== "discover") {
        await loadBrewInfo(); // Refresh the list
      }
    } catch (error) {
      setMessage(`Error updating all packages: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const renderPackageCard = (pkg: BrewPackage, isSearchResult = false) => (
    <div key={pkg.name} className="package-card">
      <div className="package-header">
        <div className="package-icon-container">
          <img 
            src={`https://github.com/App-Fair/appcasks/releases/download/cask-${pkg.name}/AppIcon.png`}
            alt={`${pkg.name} icon`}
            className="package-icon"
            onError={(e) => {
              // Fallback to icon.horse if App-Fair icon fails
              const target = e.target as HTMLImageElement;
              const homepage = pkg.description.includes('homepage') ? 
                pkg.description.split('homepage:')[1]?.split(' ')[0] : 
                pkg.name;
              target.src = `https://icon.horse/icon/${homepage}`;
              target.onerror = () => {
                // Final fallback to default icon
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              };
            }}
          />
          <FiPackage className="package-icon-fallback hidden" />
        </div>
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
            onClick={() => handleInstall(pkg.name)}
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
                onClick={() => handleUpdate(pkg.name)}
                disabled={loading}
                className="btn btn-secondary"
              >
                <FiRefreshCw size={16} />
                Update
              </button>
            )}
            <button
              onClick={() => handleUninstall(pkg.name)}
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
            handleSearch();
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
                onClick={handleUpdateAll}
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
            <button onClick={() => setMessage("")} className="message-close">×</button>
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
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
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
