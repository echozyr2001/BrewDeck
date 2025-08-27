use anyhow::Result;
use reqwest;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
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
    pub analytics: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct CaskApiInfo {
    token: String,
    name: Vec<String>,
    desc: Option<String>,
    homepage: Option<String>,
    version: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct FormulaApiInfo {
    name: String,
    desc: Option<String>,
    homepage: Option<String>,
    versions: FormulaVersions,
}

#[derive(Debug, Serialize, Deserialize)]
struct FormulaVersions {
    stable: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BrewInfo {
    pub packages: Vec<BrewPackage>,
    pub total_installed: usize,
    pub total_outdated: usize,
}

#[tauri::command]
async fn get_brew_info() -> Result<BrewInfo, String> {
    let mut packages = Vec::new();

    // Get installed packages
    let installed_output = Command::new("brew")
        .args(["list", "--formula"])
        .output()
        .map_err(|e| format!("Failed to get installed packages: {e}"))?;

    let installed_packages: Vec<String> = String::from_utf8_lossy(&installed_output.stdout)
        .lines()
        .map(|s| s.to_string())
        .collect();

    // Get outdated packages
    let outdated_output = Command::new("brew")
        .args(["outdated", "--formula"])
        .output()
        .map_err(|e| format!("Failed to get outdated packages: {e}"))?;

    let outdated_packages: Vec<String> = String::from_utf8_lossy(&outdated_output.stdout)
        .lines()
        .map(|s| s.to_string())
        .collect();

    // Fetch formula info from Homebrew API
    let client = reqwest::Client::new();
    let api_response = client
        .get("https://formulae.brew.sh/api/formula.json")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch formula API: {e}"))?;

    let formula_api_data: Vec<FormulaApiInfo> = api_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse formula API response: {e}"))?;

    // Create a map for quick lookup
    let mut formula_info_map = std::collections::HashMap::new();
    for formula_info in formula_api_data {
        formula_info_map.insert(formula_info.name.clone(), formula_info);
    }

    // Get all available packages (this is a simplified version)
    for package_name in installed_packages {
        let is_outdated = outdated_packages.contains(&package_name);

        // Get info from API
        let api_info = formula_info_map.get(&package_name);
        let description = api_info
            .and_then(|info| info.desc.as_ref())
            .map(|desc| desc.clone())
            .unwrap_or_else(|| format!("Package: {package_name}"));

        let homepage = api_info
            .and_then(|info| info.homepage.as_ref())
            .map(|homepage| homepage.clone())
            .unwrap_or_else(|| String::new());

        packages.push(BrewPackage {
            name: package_name.clone(),
            version: api_info
                .map(|info| info.versions.stable.clone())
                .unwrap_or_else(|| "latest".to_string()),
            description,
            installed: true,
            outdated: is_outdated,
            homepage,
            dependencies: Vec::new(),
            conflicts: Vec::new(),
            caveats: String::new(),
            analytics: 0,
        });
    }

    let total_outdated = outdated_packages.len();
    let total_installed = packages.len();

    Ok(BrewInfo {
        packages,
        total_installed,
        total_outdated,
    })
}

#[tauri::command]
async fn install_package(package_name: String) -> Result<String, String> {
    let output = Command::new("brew")
        .args(["install", &package_name])
        .output()
        .map_err(|e| format!("Failed to install package: {e}"))?;

    if output.status.success() {
        Ok(format!("Successfully installed {package_name}"))
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to install {package_name}: {error}"))
    }
}

#[tauri::command]
async fn uninstall_package(package_name: String) -> Result<String, String> {
    let output = Command::new("brew")
        .args(["uninstall", &package_name])
        .output()
        .map_err(|e| format!("Failed to uninstall package: {e}"))?;

    if output.status.success() {
        Ok(format!("Successfully uninstalled {package_name}"))
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to uninstall {package_name}: {error}"))
    }
}

#[tauri::command]
async fn update_package(package_name: String) -> Result<String, String> {
    let output = Command::new("brew")
        .args(["upgrade", &package_name])
        .output()
        .map_err(|e| format!("Failed to update package: {e}"))?;

    if output.status.success() {
        Ok(format!("Successfully updated {package_name}"))
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to update {package_name}: {error}"))
    }
}

#[tauri::command]
async fn update_all_packages() -> Result<String, String> {
    let output = Command::new("brew")
        .args(["upgrade"])
        .output()
        .map_err(|e| format!("Failed to update all packages: {e}"))?;

    if output.status.success() {
        Ok("Successfully updated all packages".to_string())
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to update all packages: {error}"))
    }
}

#[tauri::command]
async fn search_packages(query: String) -> Result<Vec<BrewPackage>, String> {
    // Fetch formula info from Homebrew API
    let client = reqwest::Client::new();
    let api_response = client
        .get("https://formulae.brew.sh/api/formula.json")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch formula API: {e}"))?;

    let formula_api_data: Vec<FormulaApiInfo> = api_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse formula API response: {e}"))?;

    // Filter formulae matching query
    let query_lower = query.to_lowercase();
    let matching_formulae: Vec<&FormulaApiInfo> = formula_api_data
        .iter()
        .filter(|formula| {
            formula.name.to_lowercase().contains(&query_lower)
                || formula
                    .desc
                    .as_ref()
                    .map_or(false, |desc| desc.to_lowercase().contains(&query_lower))
        })
        .take(50) // Limit results
        .collect();

    // Get installed and outdated formulae to mark status
    let installed_output = Command::new("brew")
        .args(["list", "--formula"])
        .output()
        .map_err(|e| format!("Failed to get installed formulae: {e}"))?;
    let installed: Vec<String> = String::from_utf8_lossy(&installed_output.stdout)
        .lines()
        .map(|s| s.to_string())
        .collect();

    let outdated_output = Command::new("brew")
        .args(["outdated", "--formula"])
        .output()
        .map_err(|e| format!("Failed to get outdated formulae: {e}"))?;
    let outdated: Vec<String> = String::from_utf8_lossy(&outdated_output.stdout)
        .lines()
        .map(|s| s.to_string())
        .collect();

    let packages: Vec<BrewPackage> = matching_formulae
        .into_iter()
        .map(|formula_info| {
            let is_installed = installed.contains(&formula_info.name);
            let is_outdated = is_installed && outdated.contains(&formula_info.name);

            BrewPackage {
                name: formula_info.name.clone(),
                version: formula_info.versions.stable.clone(),
                description: formula_info
                    .desc
                    .clone()
                    .unwrap_or_else(|| format!("Formula: {}", formula_info.name)),
                installed: is_installed,
                outdated: is_outdated,
                homepage: formula_info
                    .homepage
                    .clone()
                    .unwrap_or_else(|| String::new()),
                dependencies: Vec::new(),
                conflicts: Vec::new(),
                caveats: String::new(),
                analytics: 0,
            }
        })
        .collect();

    Ok(packages)
}

// =====================
// Casks (Apps) commands
// =====================

#[tauri::command]
async fn get_cask_info() -> Result<BrewInfo, String> {
    let mut packages = Vec::new();

    let installed_output = Command::new("brew")
        .args(["list", "--cask"])
        .output()
        .map_err(|e| format!("Failed to get installed casks: {e}"))?;

    let installed: Vec<String> = String::from_utf8_lossy(&installed_output.stdout)
        .lines()
        .map(|s| s.to_string())
        .collect();

    let outdated_output = Command::new("brew")
        .args(["outdated", "--cask"])
        .output()
        .map_err(|e| format!("Failed to get outdated casks: {e}"))?;

    let outdated: Vec<String> = String::from_utf8_lossy(&outdated_output.stdout)
        .lines()
        .map(|s| s.to_string())
        .collect();

    // Fetch cask info from Homebrew API
    let client = reqwest::Client::new();
    let api_response = client
        .get("https://formulae.brew.sh/api/cask.json")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch cask API: {e}"))?;

    let cask_api_data: Vec<CaskApiInfo> = api_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse cask API response: {e}"))?;

    // Create a map for quick lookup
    let mut cask_info_map = std::collections::HashMap::new();
    for cask_info in cask_api_data {
        cask_info_map.insert(cask_info.token.clone(), cask_info);
    }

    for cask in installed {
        let is_outdated = outdated.contains(&cask);

        // Get info from API
        let api_info = cask_info_map.get(&cask);
        let description = api_info
            .and_then(|info| info.desc.as_ref())
            .map(|desc| desc.clone())
            .unwrap_or_else(|| format!("Cask: {cask}"));

        let homepage = api_info
            .and_then(|info| info.homepage.as_ref())
            .map(|homepage| homepage.clone())
            .unwrap_or_else(|| String::new());

        packages.push(BrewPackage {
            name: cask.clone(),
            version: "latest".to_string(),
            description,
            installed: true,
            outdated: is_outdated,
            homepage,
            dependencies: Vec::new(),
            conflicts: Vec::new(),
            caveats: String::new(),
            analytics: 0,
        });
    }

    Ok(BrewInfo {
        total_installed: packages.len(),
        total_outdated: outdated.len(),
        packages,
    })
}

#[tauri::command]
async fn search_casks(query: String) -> Result<Vec<BrewPackage>, String> {
    // Fetch cask info from Homebrew API
    let client = reqwest::Client::new();
    let api_response = client
        .get("https://formulae.brew.sh/api/cask.json")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch cask API: {e}"))?;

    let cask_api_data: Vec<CaskApiInfo> = api_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse cask API response: {e}"))?;

    // Filter casks matching query
    let query_lower = query.to_lowercase();
    let matching_casks: Vec<&CaskApiInfo> = cask_api_data
        .iter()
        .filter(|cask| {
            cask.token.to_lowercase().contains(&query_lower)
                || cask
                    .name
                    .iter()
                    .any(|name| name.to_lowercase().contains(&query_lower))
                || cask
                    .desc
                    .as_ref()
                    .map_or(false, |desc| desc.to_lowercase().contains(&query_lower))
        })
        .take(50) // Limit results
        .collect();

    // Get installed and outdated casks
    let installed_output = Command::new("brew")
        .args(["list", "--cask"])
        .output()
        .map_err(|e| format!("Failed to get installed casks: {e}"))?;
    let installed: Vec<String> = String::from_utf8_lossy(&installed_output.stdout)
        .lines()
        .map(|s| s.to_string())
        .collect();

    let outdated_output = Command::new("brew")
        .args(["outdated", "--cask"])
        .output()
        .map_err(|e| format!("Failed to get outdated casks: {e}"))?;
    let outdated: Vec<String> = String::from_utf8_lossy(&outdated_output.stdout)
        .lines()
        .map(|s| s.to_string())
        .collect();

    let packages: Vec<BrewPackage> = matching_casks
        .into_iter()
        .map(|cask_info| {
            let is_installed = installed.contains(&cask_info.token);
            let is_outdated = is_installed && outdated.contains(&cask_info.token);

            BrewPackage {
                name: cask_info.token.clone(),
                version: cask_info.version.clone(),
                description: cask_info
                    .desc
                    .clone()
                    .unwrap_or_else(|| format!("Cask: {}", cask_info.token)),
                installed: is_installed,
                outdated: is_outdated,
                homepage: cask_info.homepage.clone().unwrap_or_else(|| String::new()),
                dependencies: Vec::new(),
                conflicts: Vec::new(),
                caveats: String::new(),
                analytics: 0,
            }
        })
        .collect();

    Ok(packages)
}

#[tauri::command]
async fn install_cask(package_name: String) -> Result<String, String> {
    let output = Command::new("brew")
        .args(["install", "--cask", &package_name])
        .output()
        .map_err(|e| format!("Failed to install cask: {e}"))?;

    if output.status.success() {
        Ok(format!("Successfully installed {package_name}"))
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to install {package_name}: {error}"))
    }
}

#[tauri::command]
async fn uninstall_cask(package_name: String) -> Result<String, String> {
    let output = Command::new("brew")
        .args(["uninstall", "--cask", &package_name])
        .output()
        .map_err(|e| format!("Failed to uninstall cask: {e}"))?;

    if output.status.success() {
        Ok(format!("Successfully uninstalled {package_name}"))
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to uninstall {package_name}: {error}"))
    }
}

#[tauri::command]
async fn update_cask(package_name: String) -> Result<String, String> {
    let output = Command::new("brew")
        .args(["upgrade", "--cask", &package_name])
        .output()
        .map_err(|e| format!("Failed to update cask: {e}"))?;

    if output.status.success() {
        Ok(format!("Successfully updated {package_name}"))
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to update {package_name}: {error}"))
    }
}

#[tauri::command]
async fn update_all_casks() -> Result<String, String> {
    let output = Command::new("brew")
        .args(["upgrade", "--cask"])
        .output()
        .map_err(|e| format!("Failed to update all casks: {e}"))?;

    if output.status.success() {
        Ok("Successfully updated all casks".to_string())
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to update all casks: {error}"))
    }
}

#[tauri::command]
async fn get_package_details(
    package_name: String,
    package_type: String,
) -> Result<BrewPackage, String> {
    // Try API first, then fall back to brew info command
    match get_package_details_from_api(&package_name, &package_type).await {
        Ok(package) => Ok(package),
        Err(_) => {
            // Fall back to brew info command
            get_package_details_from_brew_info(&package_name, &package_type).await
        }
    }
}

async fn get_package_details_from_api(
    package_name: &str,
    package_type: &str,
) -> Result<BrewPackage, String> {
    // Use Homebrew API to get detailed information
    let api_url = if package_type == "cask" {
        "https://formulae.brew.sh/api/cask.json"
    } else {
        "https://formulae.brew.sh/api/formula.json"
    };

    // Fetch data from Homebrew API
    let response = reqwest::get(api_url)
        .await
        .map_err(|e| format!("Failed to fetch API data: {}", e))?;

    let packages: Vec<serde_json::Value> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse API response: {}", e))?;

    // Find the specific package (try exact match first, then case-insensitive)
    // For casks, use "token" field; for formulae, use "name" field
    let field_name = if package_type == "cask" {
        "token"
    } else {
        "name"
    };

    let package_data = packages
        .iter()
        .find(|pkg| pkg[field_name].as_str() == Some(package_name))
        .or_else(|| {
            packages.iter().find(|pkg| {
                pkg[field_name]
                    .as_str()
                    .map(|name| name.to_lowercase() == package_name.to_lowercase())
                    .unwrap_or(false)
            })
        })
        .ok_or_else(|| format!("Package '{}' not found in API", package_name))?;

    // Extract information from API response
    let mut package = BrewPackage {
        name: package_name.to_string(),
        description: package_data["desc"]
            .as_str()
            .unwrap_or("No description available")
            .to_string(),
        version: package_data["versions"]["stable"]
            .as_str()
            .unwrap_or("N/A")
            .to_string(),
        installed: false,
        outdated: false,
        homepage: package_data["homepage"].as_str().unwrap_or("").to_string(),
        dependencies: Vec::new(),
        conflicts: Vec::new(),
        caveats: String::new(),
        analytics: 0,
    };

    // Extract dependencies
    if let Some(deps) = package_data["dependencies"].as_array() {
        package.dependencies = deps
            .iter()
            .filter_map(|dep| dep.as_str())
            .map(|s| s.to_string())
            .collect();
    }

    // Extract conflicts
    if let Some(conflicts) = package_data["conflicts_with"].as_array() {
        package.conflicts = conflicts
            .iter()
            .filter_map(|conflict| conflict.as_str())
            .map(|s| s.to_string())
            .collect();
    }

    // Extract caveats if available
    if let Some(caveats) = package_data["caveats"].as_str() {
        package.caveats = caveats.to_string();
    }

    // Extract analytics data
    if let Some(analytics) = package_data["analytics"]["install"]["365d"].as_u64() {
        package.analytics = analytics;
    }

    // Check if installed using brew command
    let installed_output = if package_type == "cask" {
        Command::new("brew")
            .args(["list", "--cask", &package_name])
            .output()
            .map_err(|e| format!("Failed to check if cask is installed: {}", e))?
    } else {
        Command::new("brew")
            .args(["list", &package_name])
            .output()
            .map_err(|e| format!("Failed to check if formula is installed: {}", e))?
    };

    package.installed = installed_output.status.success();

    // Check if outdated
    if package.installed {
        let outdated_output = if package_type == "cask" {
            Command::new("brew")
                .args(["outdated", "--cask", &package_name])
                .output()
                .map_err(|e| format!("Failed to check if cask is outdated: {}", e))?
        } else {
            Command::new("brew")
                .args(["outdated", &package_name])
                .output()
                .map_err(|e| format!("Failed to check if formula is outdated: {}", e))?
        };

        package.outdated = outdated_output.status.success();
    }

    Ok(package)
}

async fn get_package_details_from_brew_info(
    package_name: &str,
    package_type: &str,
) -> Result<BrewPackage, String> {
    let output = if package_type == "cask" {
        Command::new("brew")
            .args(["info", "--cask", package_name])
            .output()
            .map_err(|e| format!("Failed to get cask info: {}", e))?
    } else {
        Command::new("brew")
            .args(["info", package_name])
            .output()
            .map_err(|e| format!("Failed to get formula info: {}", e))?
    };

    if !output.status.success() {
        return Err(format!(
            "Failed to get package info: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = output_str.lines().collect();

    let mut package = BrewPackage {
        name: package_name.to_string(),
        description: String::new(),
        version: String::new(),
        installed: false,
        outdated: false,
        homepage: String::new(),
        dependencies: Vec::new(),
        conflicts: Vec::new(),
        caveats: String::new(),
        analytics: 0,
    };

    let mut in_caveats = false;
    let mut caveats_lines = Vec::new();

    for line in lines {
        let line = line.trim();

        // Skip empty lines
        if line.is_empty() {
            continue;
        }

        // Parse version (format: "==> package_name: version")
        if line.starts_with(&format!("==> {}: ", package_name)) {
            if let Some(version_part) = line.split(": ").nth(1) {
                // Extract version from "stable 4.1.0 (bottled), HEAD"
                if let Some(version) = version_part.split_whitespace().nth(1) {
                    package.version = version.to_string();
                }
            }
        }
        // Parse description (single line after version)
        else if !line.starts_with("==>")
            && !line.starts_with("https://")
            && !line.starts_with("Installed")
            && !line.starts_with("From:")
            && !line.starts_with("License:")
            && !line.starts_with("==> Options")
            && !line.starts_with("--")
            && !line.starts_with("==> Analytics")
            && !line.starts_with("install:")
            && !line.starts_with("install-on-request:")
            && !line.starts_with("build-error:")
            && !line.starts_with("==> Caveats")
            && !line.starts_with("To install")
            && !line.starts_with("  brew install")
        {
            // This should be the description line
            if package.description.is_empty() {
                package.description = line.to_string();
            }
        }
        // Parse homepage (URL line)
        else if line.starts_with("https://") {
            package.homepage = line.to_string();
        }
        // Parse caveats section
        else if line.starts_with("==> Caveats") {
            in_caveats = true;
            continue;
        } else if in_caveats {
            if line.starts_with("==>") {
                // End of caveats section
                in_caveats = false;
            } else {
                caveats_lines.push(line.to_string());
            }
        }
        // Parse dependencies (if present)
        else if line.starts_with("Dependencies: ") {
            let deps = line.replace("Dependencies: ", "");
            if !deps.is_empty() && deps != "None" {
                package.dependencies = deps.split(", ").map(|s| s.to_string()).collect();
            }
        }
        // Parse conflicts (if present)
        else if line.starts_with("Conflicts with: ") {
            let conflicts = line.replace("Conflicts with: ", "");
            if !conflicts.is_empty() && conflicts != "None" {
                package.conflicts = conflicts.split(", ").map(|s| s.to_string()).collect();
            }
        }
    }

    // Join caveats lines
    if !caveats_lines.is_empty() {
        package.caveats = caveats_lines.join("\n");
    }

    // Check if installed
    let installed_output = if package_type == "cask" {
        Command::new("brew")
            .args(["list", "--cask", package_name])
            .output()
            .map_err(|e| format!("Failed to check if cask is installed: {}", e))?
    } else {
        Command::new("brew")
            .args(["list", package_name])
            .output()
            .map_err(|e| format!("Failed to check if formula is installed: {}", e))?
    };

    package.installed = installed_output.status.success();

    // Check if outdated
    if package.installed {
        let outdated_output = if package_type == "cask" {
            Command::new("brew")
                .args(["outdated", "--cask", package_name])
                .output()
                .map_err(|e| format!("Failed to check if cask is outdated: {}", e))?
        } else {
            Command::new("brew")
                .args(["outdated", package_name])
                .output()
                .map_err(|e| format!("Failed to check if formula is outdated: {}", e))?
        };

        package.outdated = outdated_output.status.success();
    }

    Ok(package)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_brew_info,
            install_package,
            uninstall_package,
            update_package,
            update_all_packages,
            search_packages,
            get_cask_info,
            search_casks,
            install_cask,
            uninstall_cask,
            update_cask,
            update_all_casks,
            get_package_details
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
