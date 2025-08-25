use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct BrewPackage {
    pub name: String,
    pub version: String,
    pub description: String,
    pub installed: bool,
    pub outdated: bool,
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

    // Get all available packages (this is a simplified version)
    for package_name in installed_packages {
        let is_outdated = outdated_packages.contains(&package_name);
        packages.push(BrewPackage {
            name: package_name.clone(),
            version: "latest".to_string(), // In a real implementation, you'd get the actual version
            description: format!("Package: {package_name}"),
            installed: true,
            outdated: is_outdated,
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
    let output = Command::new("brew")
        .args(["search", &query])
        .output()
        .map_err(|e| format!("Failed to search packages: {e}"))?;

    let packages: Vec<BrewPackage> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter(|line| !line.is_empty())
        .map(|package_name| BrewPackage {
            name: package_name.to_string(),
            version: "latest".to_string(),
            description: format!("Search result for: {package_name}"),
            installed: false,
            outdated: false,
        })
        .collect();

    Ok(packages)
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
            search_packages
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
