use crate::error::{BrewDeckError, ErrorRecovery, retry_with_backoff};
use crate::services::brew_client::PackageType;
use crate::services::package_service::{PackageAnalytics, PackageWarning, WarningType, WarningSeverity};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use tracing::{debug, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiPackageInfo {
    pub name: String,
    pub token: Option<String>, // For casks
    pub version: String,
    pub description: String,
    pub homepage: Option<String>,
    pub dependencies: Vec<String>,
    pub conflicts: Vec<String>,
    pub caveats: Option<String>,
    pub analytics: ApiAnalytics,
    pub deprecated: bool,
    pub disabled: bool,
    pub warnings: Vec<String>,
    pub license: Option<String>,
    pub tap: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiAnalytics {
    pub install: HashMap<String, u64>,
    pub install_on_request: HashMap<String, u64>,
    pub build_error: HashMap<String, u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiFormulaResponse {
    pub name: String,
    pub full_name: String,
    pub tap: String,
    pub oldname: Option<String>,
    pub aliases: Vec<String>,
    pub versioned_formulae: Vec<String>,
    pub desc: Option<String>,
    pub license: Option<String>,
    pub homepage: Option<String>,
    pub versions: ApiVersions,
    pub urls: ApiUrls,
    pub revision: u32,
    pub version_scheme: u32,
    pub bottle: ApiBottle,
    pub keg_only: bool,
    pub keg_only_reason: Option<String>,
    pub options: Vec<String>,
    pub build_dependencies: Vec<String>,
    pub dependencies: Vec<String>,
    pub test_dependencies: Vec<String>,
    pub recommended_dependencies: Vec<String>,
    pub optional_dependencies: Vec<String>,
    pub uses_from_macos: Vec<String>,
    pub requirements: Vec<String>,
    pub conflicts_with: Vec<String>,
    pub conflicts_with_reasons: Vec<String>,
    pub link_overwrite: Vec<String>,
    pub caveats: Option<String>,
    pub installed: Vec<ApiInstalled>,
    pub linked_keg: Option<String>,
    pub pinned: bool,
    pub outdated: bool,
    pub deprecated: bool,
    pub deprecation_date: Option<String>,
    pub deprecation_reason: Option<String>,
    pub disabled: bool,
    pub disable_date: Option<String>,
    pub disable_reason: Option<String>,
    pub analytics: ApiAnalytics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiCaskResponse {
    pub token: String,
    pub full_token: String,
    pub tap: String,
    pub name: Vec<String>,
    pub desc: Option<String>,
    pub homepage: Option<String>,
    pub url: String,
    pub appcast: Option<String>,
    pub version: String,
    pub installed: Option<String>,
    pub outdated: bool,
    pub sha256: String,
    pub artifacts: Vec<serde_json::Value>,
    pub caveats: Option<String>,
    pub depends_on: ApiDependsOn,
    pub conflicts_with: Option<serde_json::Value>,
    pub container: Option<String>,
    pub auto_updates: Option<bool>,
    pub tap_git_head: String,
    pub languages: Vec<String>,
    pub ruby_source_path: String,
    pub ruby_source_checksum: HashMap<String, String>,
    pub variations: HashMap<String, serde_json::Value>,
    pub analytics: ApiAnalytics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiVersions {
    pub stable: String,
    pub head: Option<String>,
    pub bottle: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiUrls {
    pub stable: ApiUrl,
    pub head: Option<ApiUrl>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiUrl {
    pub url: String,
    pub tag: Option<String>,
    pub revision: Option<String>,
    pub checksum: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiBottle {
    pub rebuild: u32,
    pub root_url: String,
    pub files: HashMap<String, ApiBottleFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiBottleFile {
    pub cellar: String,
    pub url: String,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiInstalled {
    pub version: String,
    pub used_options: Vec<String>,
    pub built_as_bottle: bool,
    pub poured_from_bottle: bool,
    pub time: u64,
    pub runtime_dependencies: Vec<String>,
    pub installed_as_dependency: bool,
    pub installed_on_request: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiDependsOn {
    pub macos: Option<HashMap<String, Vec<String>>>,
    pub arch: Option<HashMap<String, Vec<String>>>,
    pub formula: Vec<String>,
    pub cask: Vec<String>,
}

pub struct ApiClient {
    client: reqwest::Client,
    base_url: String,
}

impl ApiClient {
    pub fn new() -> Result<Self, BrewDeckError> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("BrewDeck/1.0")
            .build()
            .map_err(|e| BrewDeckError::NetworkError(e.to_string()))?;
        
        Ok(Self {
            client,
            base_url: "https://formulae.brew.sh/api".to_string(),
        })
    }
    
    pub async fn fetch_all_formulae(&self) -> Result<Vec<ApiFormulaResponse>, BrewDeckError> {
        let url = format!("{}/formula.json", self.base_url);
        self.fetch_with_retry(&url).await
    }
    
    pub async fn fetch_all_casks(&self) -> Result<Vec<ApiCaskResponse>, BrewDeckError> {
        let url = format!("{}/cask.json", self.base_url);
        self.fetch_with_retry(&url).await
    }
    
    pub async fn fetch_formula(&self, name: &str) -> Result<ApiFormulaResponse, BrewDeckError> {
        let url = format!("{}/formula/{}.json", self.base_url, name);
        self.fetch_with_retry(&url).await
    }
    
    pub async fn fetch_cask(&self, name: &str) -> Result<ApiCaskResponse, BrewDeckError> {
        let url = format!("{}/cask/{}.json", self.base_url, name);
        self.fetch_with_retry(&url).await
    }
    
    pub async fn fetch_analytics(&self, package_type: PackageType) -> Result<HashMap<String, u64>, BrewDeckError> {
        let endpoint = match package_type {
            PackageType::Formula => "analytics/install/365d.json",
            PackageType::Cask => "analytics-linux/cask-install/365d.json",
        };
        
        let url = format!("{}/{}", self.base_url, endpoint);
        let response: HashMap<String, HashMap<String, u64>> = self.fetch_with_retry(&url).await?;
        
        // Extract the items from the response
        Ok(response.get("items").cloned().unwrap_or_default())
    }
    
    async fn fetch_with_retry<T>(&self, url: &str) -> Result<T, BrewDeckError>
    where
        T: for<'de> serde::Deserialize<'de>,
    {
        let recovery = ErrorRecovery::new()
            .with_max_retries(3)
            .with_backoff(1000);
        
        retry_with_backoff(|| self.fetch_once(url), recovery).await
    }
    
    async fn fetch_once<T>(&self, url: &str) -> Result<T, BrewDeckError>
    where
        T: for<'de> serde::Deserialize<'de>,
    {
        debug!("Fetching from API: {}", url);
        
        let response = self.client.get(url).send().await?;
        
        if !response.status().is_success() {
            return Err(BrewDeckError::NetworkError(
                format!("API request failed with status: {}", response.status())
            ));
        }
        
        let data = response.json().await?;
        Ok(data)
    }
}

pub struct PackageParser;

impl PackageParser {
    pub fn parse_formula_to_package_info(formula: ApiFormulaResponse) -> ApiPackageInfo {
        let warnings = Self::extract_formula_warnings(&formula);
        
        ApiPackageInfo {
            name: formula.name,
            token: None,
            version: formula.versions.stable,
            description: formula.desc.unwrap_or_else(|| "No description available".to_string()),
            homepage: formula.homepage,
            dependencies: formula.dependencies,
            conflicts: formula.conflicts_with,
            caveats: formula.caveats,
            analytics: formula.analytics,
            deprecated: formula.deprecated,
            disabled: formula.disabled,
            warnings,
            license: formula.license,
            tap: formula.tap,
        }
    }
    
    pub fn parse_cask_to_package_info(cask: ApiCaskResponse) -> ApiPackageInfo {
        let warnings = Self::extract_cask_warnings(&cask);
        
        ApiPackageInfo {
            name: cask.name.first().cloned().unwrap_or(cask.token.clone()),
            token: Some(cask.token),
            version: cask.version,
            description: cask.desc.unwrap_or_else(|| "No description available".to_string()),
            homepage: cask.homepage,
            dependencies: cask.depends_on.formula,
            conflicts: Vec::new(), // Casks don't typically have conflicts in the same way
            caveats: cask.caveats,
            analytics: cask.analytics,
            deprecated: false, // Casks don't have deprecated field in the same way
            disabled: false,
            warnings,
            license: None, // Casks don't typically have license info
            tap: cask.tap,
        }
    }
    

    
    fn extract_formula_warnings(formula: &ApiFormulaResponse) -> Vec<String> {
        let mut warnings = Vec::new();
        
        if formula.deprecated {
            let mut warning = "This formula is deprecated".to_string();
            if let Some(reason) = &formula.deprecation_reason {
                warning.push_str(&format!(": {}", reason));
            }
            warnings.push(warning);
        }
        
        if formula.disabled {
            let mut warning = "This formula is disabled".to_string();
            if let Some(reason) = &formula.disable_reason {
                warning.push_str(&format!(": {}", reason));
            }
            warnings.push(warning);
        }
        
        if formula.keg_only {
            let mut warning = "This formula is keg-only".to_string();
            if let Some(reason) = &formula.keg_only_reason {
                warning.push_str(&format!(": {}", reason));
            }
            warnings.push(warning);
        }
        
        if !formula.conflicts_with.is_empty() {
            warnings.push(format!(
                "Conflicts with: {}",
                formula.conflicts_with.join(", ")
            ));
        }
        
        warnings
    }
    
    fn extract_cask_warnings(cask: &ApiCaskResponse) -> Vec<String> {
        let mut warnings = Vec::new();
        
        if cask.auto_updates == Some(false) {
            warnings.push("This application does not auto-update".to_string());
        }
        
        if !cask.depends_on.formula.is_empty() {
            warnings.push(format!(
                "Requires formulae: {}",
                cask.depends_on.formula.join(", ")
            ));
        }
        
        if !cask.depends_on.cask.is_empty() {
            warnings.push(format!(
                "Requires other casks: {}",
                cask.depends_on.cask.join(", ")
            ));
        }
        
        warnings
    }
    
    pub fn convert_to_package_warnings(warning_strings: Vec<String>) -> Vec<PackageWarning> {
        warning_strings
            .into_iter()
            .map(|warning| {
                let (warning_type, severity) = Self::classify_warning(&warning);
                PackageWarning {
                    warning_type,
                    message: warning,
                    severity,
                }
            })
            .collect()
    }
    
    fn classify_warning(warning: &str) -> (WarningType, WarningSeverity) {
        let warning_lower = warning.to_lowercase();
        
        if warning_lower.contains("deprecated") {
            (WarningType::Deprecated, WarningSeverity::Medium)
        } else if warning_lower.contains("disabled") {
            (WarningType::Deprecated, WarningSeverity::High)
        } else if warning_lower.contains("conflicts") {
            (WarningType::ConflictsWith, WarningSeverity::Medium)
        } else if warning_lower.contains("requires") || warning_lower.contains("depends") {
            (WarningType::Compatibility, WarningSeverity::Low)
        } else if warning_lower.contains("keg-only") {
            (WarningType::Compatibility, WarningSeverity::Low)
        } else if warning_lower.contains("experimental") || warning_lower.contains("beta") {
            (WarningType::Experimental, WarningSeverity::Medium)
        } else {
            (WarningType::Compatibility, WarningSeverity::Low)
        }
    }
}