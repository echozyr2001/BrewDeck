import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  FiSearch, 
  FiPackage, 
  FiDownload, 
  FiTrash2, 
  FiRefreshCw, 
  FiHome, 
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

function App() {
  const [brewInfo, setBrewInfo] = useState<BrewInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BrewPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"installed" | "search">("installed");

  useEffect(() => {
    loadBrewInfo();
  }, []);

  const loadBrewInfo = async () => {
    setLoading(true);
    try {
      const info = await invoke<BrewInfo>("get_brew_info");
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
      const results = await invoke<BrewPackage[]>("search_packages", { query: searchQuery });
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
      const result = await invoke<string>("install_package", { packageName });
      setMessage(result);
      await loadBrewInfo(); // Refresh the list
    } catch (error) {
      setMessage(`Error installing package: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async (packageName: string) => {
    setLoading(true);
    try {
      const result = await invoke<string>("uninstall_package", { packageName });
      setMessage(result);
      await loadBrewInfo(); // Refresh the list
    } catch (error) {
      setMessage(`Error uninstalling package: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (packageName: string) => {
    setLoading(true);
    try {
      const result = await invoke<string>("update_package", { packageName });
      setMessage(result);
      await loadBrewInfo(); // Refresh the list
    } catch (error) {
      setMessage(`Error updating package: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAll = async () => {
    setLoading(true);
    try {
      const result = await invoke<string>("update_all_packages");
      setMessage(result);
      await loadBrewInfo(); // Refresh the list
    } catch (error) {
      setMessage(`Error updating all packages: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const renderPackageCard = (pkg: BrewPackage, isSearchResult = false) => (
    <div key={pkg.name} className="package-card">
      <div className="package-header">
        <FiPackage className="package-icon" />
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
        {!pkg.installed && isSearchResult && (
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
                placeholder="Search for packages..."
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
      </main>
    </div>
  );
}

export default App;
