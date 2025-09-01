mod error;
mod services;

use error::BrewDeckError;
use services::brew_client::PackageType;
use services::cache_manager::CacheConfig;
use services::package_service::BrewPackage;
use services::{BrewClient, CacheManager, PackageService};

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing_subscriber;

#[derive(Debug, Serialize, Deserialize)]
pub struct BrewInfo {
    pub packages: Vec<BrewPackage>,
    pub total_installed: usize,
    pub total_outdated: usize,
}

// Global service instances
static mut PACKAGE_SERVICE: Option<Arc<PackageService>> = None;

async fn get_package_service() -> Result<Arc<PackageService>, BrewDeckError> {
    unsafe {
        if PACKAGE_SERVICE.is_none() {
            // Initialize logging
            tracing_subscriber::fmt::init();

            // Create cache manager
            let cache_config = CacheConfig::default();
            let cache_manager = Arc::new(CacheManager::new(cache_config));

            // Create package service
            let service = Arc::new(PackageService::new(cache_manager).await?);
            PACKAGE_SERVICE = Some(service);
        }

        Ok(PACKAGE_SERVICE.as_ref().unwrap().clone())
    }
}

#[tauri::command]
async fn get_brew_info() -> Result<BrewInfo, String> {
    let service = get_package_service().await.map_err(|e| e.to_string())?;

    let packages = service
        .get_packages(PackageType::Formula)
        .await
        .map_err(|e| e.to_string())?;

    let total_installed = packages.iter().filter(|p| p.installed).count();
    let total_outdated = packages.iter().filter(|p| p.outdated).count();

    Ok(BrewInfo {
        packages,
        total_installed,
        total_outdated,
    })
}

#[tauri::command]
async fn install_package(package_name: String) -> Result<String, String> {
    let service = get_package_service().await.map_err(|e| e.to_string())?;

    let result = service
        .install_package(&package_name, PackageType::Formula)
        .await
        .map_err(|e| e.to_string())?;

    if result.success {
        Ok(result.message)
    } else {
        Err(result.message)
    }
}

#[tauri::command]
async fn uninstall_package(package_name: String) -> Result<String, String> {
    let service = get_package_service().await.map_err(|e| e.to_string())?;

    let result = service
        .uninstall_package(&package_name, PackageType::Formula)
        .await
        .map_err(|e| e.to_string())?;

    if result.success {
        Ok(result.message)
    } else {
        Err(result.message)
    }
}

#[tauri::command]
async fn update_package(package_name: String) -> Result<String, String> {
    let service = get_package_service().await.map_err(|e| e.to_string())?;

    let result = service
        .update_package(&package_name, PackageType::Formula)
        .await
        .map_err(|e| e.to_string())?;

    if result.success {
        Ok(result.message)
    } else {
        Err(result.message)
    }
}

#[tauri::command]
async fn update_all_packages() -> Result<String, String> {
    let _service = get_package_service().await.map_err(|e| e.to_string())?;

    // For now, we'll use the brew client directly for update all
    // In a full implementation, this would be handled by the service
    let brew_client = BrewClient::new().await.map_err(|e| e.to_string())?;
    let result = brew_client
        .update_all(Some(PackageType::Formula))
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
async fn search_packages(query: String) -> Result<Vec<BrewPackage>, String> {
    let service = get_package_service().await.map_err(|e| e.to_string())?;

    let result = service
        .search_packages(&query, PackageType::Formula)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.packages)
}

// =====================
// Casks (Apps) commands
// =====================

#[tauri::command]
async fn get_cask_info() -> Result<BrewInfo, String> {
    let service = get_package_service().await.map_err(|e| e.to_string())?;

    let packages = service
        .get_packages(PackageType::Cask)
        .await
        .map_err(|e| e.to_string())?;

    let total_installed = packages.iter().filter(|p| p.installed).count();
    let total_outdated = packages.iter().filter(|p| p.outdated).count();

    Ok(BrewInfo {
        packages,
        total_installed,
        total_outdated,
    })
}

#[tauri::command]
async fn search_casks(query: String) -> Result<Vec<BrewPackage>, String> {
    let service = get_package_service().await.map_err(|e| e.to_string())?;

    let result = service
        .search_packages(&query, PackageType::Cask)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.packages)
}

#[tauri::command]
async fn install_cask(package_name: String) -> Result<String, String> {
    let service = get_package_service().await.map_err(|e| e.to_string())?;

    let result = service
        .install_package(&package_name, PackageType::Cask)
        .await
        .map_err(|e| e.to_string())?;

    if result.success {
        Ok(result.message)
    } else {
        Err(result.message)
    }
}

#[tauri::command]
async fn uninstall_cask(package_name: String) -> Result<String, String> {
    let service = get_package_service().await.map_err(|e| e.to_string())?;

    let result = service
        .uninstall_package(&package_name, PackageType::Cask)
        .await
        .map_err(|e| e.to_string())?;

    if result.success {
        Ok(result.message)
    } else {
        Err(result.message)
    }
}

#[tauri::command]
async fn update_cask(package_name: String) -> Result<String, String> {
    let service = get_package_service().await.map_err(|e| e.to_string())?;

    let result = service
        .update_package(&package_name, PackageType::Cask)
        .await
        .map_err(|e| e.to_string())?;

    if result.success {
        Ok(result.message)
    } else {
        Err(result.message)
    }
}

#[tauri::command]
async fn update_all_casks() -> Result<String, String> {
    let brew_client = BrewClient::new().await.map_err(|e| e.to_string())?;
    let result = brew_client
        .update_all(Some(PackageType::Cask))
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
async fn get_package_details(
    package_name: String,
    package_type: String,
) -> Result<BrewPackage, String> {
    let service = get_package_service().await.map_err(|e| e.to_string())?;

    let pkg_type = package_type
        .parse::<PackageType>()
        .map_err(|e| e.to_string())?;
    let package = service
        .get_package_details(&package_name, pkg_type)
        .await
        .map_err(|e| e.to_string())?;

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
