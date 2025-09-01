use crate::error::{BrewDeckError, with_fallback};
use crate::services::{BrewClient, CacheManager};
use crate::services::brew_client::PackageType;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tracing::{debug, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrewPackage {
    pub name: String,
    pub version: String,
    pub description: String,
    pub installed: bool,
    pub outdated: bool,
    pub homepage: String,
    pub dependencies: Vec<String>,
    pub conflicts: Vec<String>,
    pub caveats: String,
    pub analytics: PackageAnalytics,
    pub category: Option<String>,
    pub warnings: Vec<PackageWarning>,
    pub install_size: Option<u64>,
    pub last_updated: Option<DateTime<Utc>>,
    pub package_type: PackageType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageAnalytics {
    pub downloads_365d: u64,
    pub popularity: f64,
    pub rating: Option<f64>,
}

impl Default for PackageAnalytics {
    fn default() -> Self {
        Self {
            downloads_365d: 0,
            popularity: 0.0,
            rating: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageWarning {
    pub warning_type: WarningType,
    pub message: String,
    pub severity: WarningSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WarningType {
    Security,
    Compatibility,
    Deprecated,
    Experimental,
    RequiresRoot,
    ConflictsWith,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WarningSeverity {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageSearchResult {
    pub packages: Vec<BrewPackage>,
    pub total_count: usize,
    pub search_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallResult {
    pub success: bool,
    pub message: String,
    pub package_name: String,
    pub duration_ms: u64,
}

pub struct PackageService {
    cache: Arc<CacheManager>,
    brew_client: Arc<BrewClient>,
    api_client: reqwest::Client,
}

impl PackageService {
    pub async fn new(cache: Arc<CacheManager>) -> Result<Self, BrewDeckError> {
        let brew_client = Arc::new(BrewClient::new().await?);
        let api_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("BrewDeck/1.0")
            .build()
            .map_err(|e| BrewDeckError::NetworkError(e.to_string()))?;
        
        Ok(Self {
            cache,
            brew_client,
            api_client,
        })
    }
    
    pub async fn get_packages(&self, package_type: PackageType) -> Result<Vec<BrewPackage>, BrewDeckError> {
        let cache_key = format!("packages_{package_type}");
        
        // Try to get from cache first
        if let Some(cached_packages) = self.cache.get::<Vec<BrewPackage>>(&cache_key).await {
            debug!("Retrieved {} packages from cache", cached_packages.len());
            return Ok(cached_packages);
        }
        
        // Fetch from API with fallback to local brew commands
        let packages = with_fallback(
            || self.fetch_packages_from_api(package_type),
            || self.fetch_packages_from_brew(package_type),
        ).await?;
        
        // Cache the results
        let cache_tags = vec![format!("packages"), format!("type_{}", package_type)];
        self.cache.set_with_tags(&cache_key, &packages, Some(Duration::from_secs(300)), cache_tags).await?;
        
        info!("Retrieved {} {} packages", packages.len(), package_type);
        Ok(packages)
    }
    
    pub async fn search_packages(&self, query: &str, package_type: PackageType) -> Result<PackageSearchResult, BrewDeckError> {
        let start_time = std::time::Instant::now();
        let cache_key = format!("search_{package_type}_{query}");
        
        // Try cache first for recent searches
        if let Some(cached_result) = self.cache.get::<PackageSearchResult>(&cache_key).await {
            debug!("Retrieved search results from cache for query: {}", query);
            return Ok(cached_result);
        }
        
        // Search using API with fallback to brew search
        let packages = with_fallback(
            || self.search_packages_api(query, package_type),
            || self.search_packages_brew(query, package_type),
        ).await?;
        
        let search_time_ms = start_time.elapsed().as_millis() as u64;
        let result = PackageSearchResult {
            total_count: packages.len(),
            packages,
            search_time_ms,
        };
        
        // Cache search results for a shorter time
        let cache_tags = vec![format!("search"), format!("type_{}", package_type)];
        self.cache.set_with_tags(&cache_key, &result, Some(Duration::from_secs(60)), cache_tags).await?;
        
        Ok(result)
    }
    
    pub async fn get_package_details(&self, name: &str, package_type: PackageType) -> Result<BrewPackage, BrewDeckError> {
        let cache_key = format!("package_{package_type}_{name}");
        
        // Try cache first
        if let Some(cached_package) = self.cache.get::<BrewPackage>(&cache_key).await {
            debug!("Retrieved package details from cache for: {}", name);
            return Ok(cached_package);
        }
        
        // Fetch detailed information with fallback
        let package = with_fallback(
            || self.fetch_package_details_api(name, package_type),
            || self.fetch_package_details_brew(name, package_type),
        ).await?;
        
        // Cache package details
        let cache_tags = vec![format!("package_details"), format!("type_{}", package_type), name.to_string()];
        self.cache.set_with_tags(&cache_key, &package, Some(Duration::from_secs(600)), cache_tags).await?;
        
        Ok(package)
    }
    
    pub async fn install_package(&self, name: &str, package_type: PackageType) -> Result<InstallResult, BrewDeckError> {
        let start_time = std::time::Instant::now();
        
        info!("Installing {} package: {}", package_type, name);
        
        let result = self.brew_client.install_package(name, package_type).await;
        let duration_ms = start_time.elapsed().as_millis() as u64;
        
        let install_result = match result {
            Ok(message) => {
                // Invalidate relevant caches
                self.invalidate_package_caches(name, package_type).await;
                
                InstallResult {
                    success: true,
                    message,
                    package_name: name.to_string(),
                    duration_ms,
                }
            }
            Err(e) => InstallResult {
                success: false,
                message: e.to_string(),
                package_name: name.to_string(),
                duration_ms,
            }
        };
        
        Ok(install_result)
    }
    
    pub async fn uninstall_package(&self, name: &str, package_type: PackageType) -> Result<InstallResult, BrewDeckError> {
        let start_time = std::time::Instant::now();
        
        info!("Uninstalling {} package: {}", package_type, name);
        
        let result = self.brew_client.uninstall_package(name, package_type).await;
        let duration_ms = start_time.elapsed().as_millis() as u64;
        
        let install_result = match result {
            Ok(message) => {
                // Invalidate relevant caches
                self.invalidate_package_caches(name, package_type).await;
                
                InstallResult {
                    success: true,
                    message,
                    package_name: name.to_string(),
                    duration_ms,
                }
            }
            Err(e) => InstallResult {
                success: false,
                message: e.to_string(),
                package_name: name.to_string(),
                duration_ms,
            }
        };
        
        Ok(install_result)
    }
    
    pub async fn update_package(&self, name: &str, package_type: PackageType) -> Result<InstallResult, BrewDeckError> {
        let start_time = std::time::Instant::now();
        
        info!("Updating {} package: {}", package_type, name);
        
        let result = self.brew_client.update_package(name, package_type).await;
        let duration_ms = start_time.elapsed().as_millis() as u64;
        
        let install_result = match result {
            Ok(message) => {
                // Invalidate relevant caches
                self.invalidate_package_caches(name, package_type).await;
                
                InstallResult {
                    success: true,
                    message,
                    package_name: name.to_string(),
                    duration_ms,
                }
            }
            Err(e) => InstallResult {
                success: false,
                message: e.to_string(),
                package_name: name.to_string(),
                duration_ms,
            }
        };
        
        Ok(install_result)
    }
    
    async fn fetch_packages_from_api(&self, package_type: PackageType) -> Result<Vec<BrewPackage>, BrewDeckError> {
        let api_url = match package_type {
            PackageType::Formula => "https://formulae.brew.sh/api/formula.json",
            PackageType::Cask => "https://formulae.brew.sh/api/cask.json",
        };
        
        debug!("Fetching packages from API: {}", api_url);
        
        let response = self.api_client.get(api_url).send().await?;
        let api_data: Vec<serde_json::Value> = response.json().await?;
        
        // Get installed and outdated packages
        let installed = self.brew_client.list_installed(package_type).await.unwrap_or_default();
        let outdated = self.brew_client.list_outdated(package_type).await.unwrap_or_default();
        
        let packages = api_data
            .into_iter()
            .map(|data| self.parse_api_package(data, package_type, &installed, &outdated))
            .collect::<Result<Vec<_>, _>>()?;
        
        Ok(packages)
    }
    
    async fn fetch_packages_from_brew(&self, package_type: PackageType) -> Result<Vec<BrewPackage>, BrewDeckError> {
        debug!("Fetching packages using brew commands");
        
        let installed = self.brew_client.list_installed(package_type).await?;
        let outdated = self.brew_client.list_outdated(package_type).await.unwrap_or_default();
        
        let mut packages = Vec::new();
        
        for package_name in installed {
            match self.fetch_package_details_brew(&package_name, package_type).await {
                Ok(package) => packages.push(package),
                Err(e) => {
                    warn!("Failed to get details for package {}: {}", package_name, e);
                    // Create a minimal package entry
                    packages.push(BrewPackage {
                        name: package_name.clone(),
                        version: "unknown".to_string(),
                        description: format!("{package_type} package"),
                        installed: true,
                        outdated: outdated.contains(&package_name),
                        homepage: String::new(),
                        dependencies: Vec::new(),
                        conflicts: Vec::new(),
                        caveats: String::new(),
                        analytics: PackageAnalytics::default(),
                        category: None,
                        warnings: Vec::new(),
                        install_size: None,
                        last_updated: None,
                        package_type,
                    });
                }
            }
        }
        
        Ok(packages)
    }
    
    async fn search_packages_api(&self, query: &str, package_type: PackageType) -> Result<Vec<BrewPackage>, BrewDeckError> {
        let packages = self.fetch_packages_from_api(package_type).await?;
        
        let query_lower = query.to_lowercase();
        let filtered_packages: Vec<BrewPackage> = packages
            .into_iter()
            .filter(|pkg| {
                pkg.name.to_lowercase().contains(&query_lower) ||
                pkg.description.to_lowercase().contains(&query_lower)
            })
            .take(50) // Limit results
            .collect();
        
        Ok(filtered_packages)
    }
    
    async fn search_packages_brew(&self, query: &str, package_type: PackageType) -> Result<Vec<BrewPackage>, BrewDeckError> {
        let search_results = self.brew_client.search(query, Some(package_type)).await?;
        
        let mut packages = Vec::new();
        for package_name in search_results.into_iter().take(20) { // Limit for performance
            match self.fetch_package_details_brew(&package_name, package_type).await {
                Ok(package) => packages.push(package),
                Err(e) => {
                    warn!("Failed to get details for search result {}: {}", package_name, e);
                }
            }
        }
        
        Ok(packages)
    }
    
    async fn fetch_package_details_api(&self, name: &str, package_type: PackageType) -> Result<BrewPackage, BrewDeckError> {
        let api_url = match package_type {
            PackageType::Formula => "https://formulae.brew.sh/api/formula.json",
            PackageType::Cask => "https://formulae.brew.sh/api/cask.json",
        };
        
        let response = self.api_client.get(api_url).send().await?;
        let api_data: Vec<serde_json::Value> = response.json().await?;
        
        let field_name = match package_type {
            PackageType::Formula => "name",
            PackageType::Cask => "token",
        };
        
        let package_data = api_data
            .into_iter()
            .find(|data| data[field_name].as_str() == Some(name))
            .ok_or_else(|| BrewDeckError::PackageNotFound(format!("Package '{name}' not found")))?;
        
        let installed = self.brew_client.list_installed(package_type).await.unwrap_or_default();
        let outdated = self.brew_client.list_outdated(package_type).await.unwrap_or_default();
        
        self.parse_api_package(package_data, package_type, &installed, &outdated)
    }
    
    async fn fetch_package_details_brew(&self, name: &str, package_type: PackageType) -> Result<BrewPackage, BrewDeckError> {
        let info_output = self.brew_client.get_package_info(name, package_type).await?;
        self.parse_brew_info(name, &info_output, package_type).await
    }
    
    fn parse_api_package(
        &self,
        data: serde_json::Value,
        package_type: PackageType,
        installed: &[String],
        outdated: &[String],
    ) -> Result<BrewPackage, BrewDeckError> {
        let name = match package_type {
            PackageType::Formula => data["name"].as_str(),
            PackageType::Cask => data["token"].as_str(),
        }.ok_or_else(|| BrewDeckError::ParsingError("Missing package name".to_string()))?;
        
        let is_installed = installed.contains(&name.to_string());
        let is_outdated = is_installed && outdated.contains(&name.to_string());
        
        let analytics = PackageAnalytics {
            downloads_365d: data["analytics"]["install"]["365d"].as_u64().unwrap_or(0),
            popularity: data["analytics"]["install"]["365d"].as_f64().unwrap_or(0.0) / 1000.0, // Normalize
            rating: None,
        };
        
        let mut warnings = Vec::new();
        
        // Check for deprecation
        if data["deprecated"].as_bool().unwrap_or(false) {
            warnings.push(PackageWarning {
                warning_type: WarningType::Deprecated,
                message: "This package is deprecated".to_string(),
                severity: WarningSeverity::Medium,
            });
        }
        
        // Check for conflicts
        if let Some(conflicts) = data["conflicts_with"].as_array() {
            if !conflicts.is_empty() {
                warnings.push(PackageWarning {
                    warning_type: WarningType::ConflictsWith,
                    message: format!("Conflicts with: {}", 
                        conflicts.iter()
                            .filter_map(|v| v.as_str())
                            .collect::<Vec<_>>()
                            .join(", ")
                    ),
                    severity: WarningSeverity::Low,
                });
            }
        }
        
        Ok(BrewPackage {
            name: name.to_string(),
            version: data["versions"]["stable"].as_str().unwrap_or("unknown").to_string(),
            description: data["desc"].as_str().unwrap_or("No description available").to_string(),
            installed: is_installed,
            outdated: is_outdated,
            homepage: data["homepage"].as_str().unwrap_or("").to_string(),
            dependencies: data["dependencies"].as_array()
                .map(|deps| deps.iter().filter_map(|d| d.as_str()).map(|s| s.to_string()).collect())
                .unwrap_or_default(),
            conflicts: data["conflicts_with"].as_array()
                .map(|conflicts| conflicts.iter().filter_map(|c| c.as_str()).map(|s| s.to_string()).collect())
                .unwrap_or_default(),
            caveats: data["caveats"].as_str().unwrap_or("").to_string(),
            analytics,
            category: None, // Would need additional categorization logic
            warnings,
            install_size: None, // Not available in API
            last_updated: None, // Would need additional parsing
            package_type,
        })
    }
    
    async fn parse_brew_info(&self, name: &str, info_output: &str, package_type: PackageType) -> Result<BrewPackage, BrewDeckError> {
        let lines: Vec<&str> = info_output.lines().collect();
        
        let mut package = BrewPackage {
            name: name.to_string(),
            version: "unknown".to_string(),
            description: String::new(),
            installed: false,
            outdated: false,
            homepage: String::new(),
            dependencies: Vec::new(),
            conflicts: Vec::new(),
            caveats: String::new(),
            analytics: PackageAnalytics::default(),
            category: None,
            warnings: Vec::new(),
            install_size: None,
            last_updated: None,
            package_type,
        };
        
        let mut in_caveats = false;
        let mut caveats_lines = Vec::new();
        
        for line in lines {
            let line = line.trim();
            
            if line.is_empty() {
                continue;
            }
            
            // Parse version
            if line.starts_with(&format!("==> {name}: ")) {
                if let Some(version_part) = line.split(": ").nth(1) {
                    if let Some(version) = version_part.split_whitespace().nth(1) {
                        package.version = version.to_string();
                    }
                }
            }
            // Parse description
            else if !line.starts_with("==>") && !line.starts_with("https://") && package.description.is_empty() {
                package.description = line.to_string();
            }
            // Parse homepage
            else if line.starts_with("https://") {
                package.homepage = line.to_string();
            }
            // Parse caveats
            else if line.starts_with("==> Caveats") {
                in_caveats = true;
            } else if in_caveats {
                if line.starts_with("==>") {
                    in_caveats = false;
                } else {
                    caveats_lines.push(line.to_string());
                }
            }
        }
        
        if !caveats_lines.is_empty() {
            package.caveats = caveats_lines.join("\n");
        }
        
        // Check installation status
        let installed = self.brew_client.list_installed(package_type).await.unwrap_or_default();
        let outdated = self.brew_client.list_outdated(package_type).await.unwrap_or_default();
        
        package.installed = installed.contains(&name.to_string());
        package.outdated = package.installed && outdated.contains(&name.to_string());
        
        Ok(package)
    }
    
    async fn invalidate_package_caches(&self, name: &str, package_type: PackageType) {
        // Invalidate specific package cache
        let package_key = format!("package_{package_type}_{name}");
        self.cache.invalidate(&package_key).await;
        
        // Invalidate package lists
        let packages_key = format!("packages_{package_type}");
        self.cache.invalidate(&packages_key).await;
        
        // Invalidate search results
        self.cache.invalidate_pattern("search_").await;
        
        info!("Invalidated caches for package: {}", name);
    }
}