use crate::error::{BrewDeckError, ErrorRecovery, retry_with_backoff};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::Duration;
use tokio::process::Command as AsyncCommand;
use tracing::{debug, error, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrewCommand {
    pub command: String,
    pub args: Vec<String>,
    pub timeout: Duration,
}

impl BrewCommand {
    pub fn new(args: Vec<String>) -> Self {
        Self {
            command: "brew".to_string(),
            args,
            timeout: Duration::from_secs(300), // 5 minutes default
        }
    }
    
    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub success: bool,
}

pub struct BrewClient {
    brew_path: String,
}

impl BrewClient {
    pub async fn new() -> Result<Self, BrewDeckError> {
        let brew_path = Self::find_brew_path().await?;
        info!("Found Homebrew at: {}", brew_path);
        
        Ok(Self { brew_path })
    }
    
    async fn find_brew_path() -> Result<String, BrewDeckError> {
        // Common Homebrew installation paths
        let common_paths = [
            "/opt/homebrew/bin/brew",  // Apple Silicon Macs
            "/usr/local/bin/brew",     // Intel Macs
            "/home/linuxbrew/.linuxbrew/bin/brew", // Linux
        ];
        
        // First, try common paths
        for path in &common_paths {
            if tokio::fs::metadata(path).await.is_ok() {
                return Ok(path.to_string());
            }
        }
        
        // If not found in common paths, try using 'which' command
        match AsyncCommand::new("which")
            .arg("brew")
            .output()
            .await
        {
            Ok(output) if output.status.success() => {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Ok(path);
                }
            }
            _ => {}
        }
        
        Err(BrewDeckError::HomebrewNotFound(
            "Homebrew not found. Please install Homebrew first.".to_string()
        ))
    }
    
    pub async fn execute(&self, command: BrewCommand) -> Result<CommandResult, BrewDeckError> {
        let recovery = ErrorRecovery::new()
            .with_max_retries(2)
            .with_backoff(1000);
        
        retry_with_backoff(|| self.execute_once(&command), recovery).await
    }
    
    async fn execute_once(&self, command: &BrewCommand) -> Result<CommandResult, BrewDeckError> {
        debug!("Executing brew command: {} {:?}", self.brew_path, command.args);
        
        let mut cmd = AsyncCommand::new(&self.brew_path);
        cmd.args(&command.args);
        
        // Set environment variables for better output
        cmd.env("HOMEBREW_NO_AUTO_UPDATE", "1");
        cmd.env("HOMEBREW_NO_INSTALL_CLEANUP", "1");
        
        let output = tokio::time::timeout(command.timeout, cmd.output())
            .await
            .map_err(|_| BrewDeckError::TimeoutError(
                format!("Command timed out after {:?}", command.timeout)
            ))?
            .map_err(|e| BrewDeckError::CommandExecutionFailed(e.to_string()))?;
        
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code().unwrap_or(-1);
        let success = output.status.success();
        
        let result = CommandResult {
            stdout: stdout.clone(),
            stderr: stderr.clone(),
            exit_code,
            success,
        };
        
        if success {
            debug!("Command executed successfully");
        } else {
            warn!("Command failed with exit code {}: {}", exit_code, stderr);
        }
        
        Ok(result)
    }
    
    pub async fn list_installed(&self, package_type: PackageType) -> Result<Vec<String>, BrewDeckError> {
        let args = match package_type {
            PackageType::Formula => vec!["list".to_string(), "--formula".to_string()],
            PackageType::Cask => vec!["list".to_string(), "--cask".to_string()],
        };
        
        let command = BrewCommand::new(args);
        let result = self.execute(command).await?;
        
        if !result.success {
            return Err(BrewDeckError::CommandExecutionFailed(
                format!("Failed to list installed packages: {}", result.stderr)
            ));
        }
        
        let packages = result.stdout
            .lines()
            .map(|line| line.trim().to_string())
            .filter(|line| !line.is_empty())
            .collect();
        
        Ok(packages)
    }
    
    pub async fn list_outdated(&self, package_type: PackageType) -> Result<Vec<String>, BrewDeckError> {
        let args = match package_type {
            PackageType::Formula => vec!["outdated".to_string(), "--formula".to_string()],
            PackageType::Cask => vec!["outdated".to_string(), "--cask".to_string()],
        };
        
        let command = BrewCommand::new(args);
        let result = self.execute(command).await?;
        
        if !result.success {
            return Err(BrewDeckError::CommandExecutionFailed(
                format!("Failed to list outdated packages: {}", result.stderr)
            ));
        }
        
        let packages = result.stdout
            .lines()
            .map(|line| line.trim().to_string())
            .filter(|line| !line.is_empty())
            .collect();
        
        Ok(packages)
    }
    
    pub async fn install_package(&self, name: &str, package_type: PackageType) -> Result<String, BrewDeckError> {
        let args = match package_type {
            PackageType::Formula => vec!["install".to_string(), name.to_string()],
            PackageType::Cask => vec!["install".to_string(), "--cask".to_string(), name.to_string()],
        };
        
        let command = BrewCommand::new(args).with_timeout(Duration::from_secs(600)); // 10 minutes for installation
        let result = self.execute(command).await?;
        
        if result.success {
            Ok(format!("Successfully installed {}", name))
        } else {
            Err(BrewDeckError::InstallationFailed(
                format!("Failed to install {}: {}", name, result.stderr)
            ))
        }
    }
    
    pub async fn uninstall_package(&self, name: &str, package_type: PackageType) -> Result<String, BrewDeckError> {
        let args = match package_type {
            PackageType::Formula => vec!["uninstall".to_string(), name.to_string()],
            PackageType::Cask => vec!["uninstall".to_string(), "--cask".to_string(), name.to_string()],
        };
        
        let command = BrewCommand::new(args);
        let result = self.execute(command).await?;
        
        if result.success {
            Ok(format!("Successfully uninstalled {}", name))
        } else {
            Err(BrewDeckError::UninstallationFailed(
                format!("Failed to uninstall {}: {}", name, result.stderr)
            ))
        }
    }
    
    pub async fn update_package(&self, name: &str, package_type: PackageType) -> Result<String, BrewDeckError> {
        let args = match package_type {
            PackageType::Formula => vec!["upgrade".to_string(), name.to_string()],
            PackageType::Cask => vec!["upgrade".to_string(), "--cask".to_string(), name.to_string()],
        };
        
        let command = BrewCommand::new(args).with_timeout(Duration::from_secs(600)); // 10 minutes for update
        let result = self.execute(command).await?;
        
        if result.success {
            Ok(format!("Successfully updated {}", name))
        } else {
            Err(BrewDeckError::UpdateFailed(
                format!("Failed to update {}: {}", name, result.stderr)
            ))
        }
    }
    
    pub async fn update_all(&self, package_type: Option<PackageType>) -> Result<String, BrewDeckError> {
        let args = match package_type {
            Some(PackageType::Formula) => vec!["upgrade".to_string(), "--formula".to_string()],
            Some(PackageType::Cask) => vec!["upgrade".to_string(), "--cask".to_string()],
            None => vec!["upgrade".to_string()],
        };
        
        let command = BrewCommand::new(args).with_timeout(Duration::from_secs(1800)); // 30 minutes for bulk update
        let result = self.execute(command).await?;
        
        if result.success {
            Ok("Successfully updated all packages".to_string())
        } else {
            Err(BrewDeckError::UpdateFailed(
                format!("Failed to update packages: {}", result.stderr)
            ))
        }
    }
    
    pub async fn get_package_info(&self, name: &str, package_type: PackageType) -> Result<String, BrewDeckError> {
        let args = match package_type {
            PackageType::Formula => vec!["info".to_string(), name.to_string()],
            PackageType::Cask => vec!["info".to_string(), "--cask".to_string(), name.to_string()],
        };
        
        let command = BrewCommand::new(args);
        let result = self.execute(command).await?;
        
        if result.success {
            Ok(result.stdout)
        } else {
            Err(BrewDeckError::PackageNotFound(
                format!("Package '{}' not found: {}", name, result.stderr)
            ))
        }
    }
    
    pub async fn search(&self, query: &str, package_type: Option<PackageType>) -> Result<Vec<String>, BrewDeckError> {
        let mut args = vec!["search".to_string()];
        
        if let Some(PackageType::Cask) = package_type {
            args.push("--cask".to_string());
        } else if let Some(PackageType::Formula) = package_type {
            args.push("--formula".to_string());
        }
        
        args.push(query.to_string());
        
        let command = BrewCommand::new(args);
        let result = self.execute(command).await?;
        
        if !result.success {
            return Err(BrewDeckError::CommandExecutionFailed(
                format!("Search failed: {}", result.stderr)
            ));
        }
        
        let packages = result.stdout
            .lines()
            .map(|line| line.trim().to_string())
            .filter(|line| !line.is_empty() && !line.starts_with("==>"))
            .collect();
        
        Ok(packages)
    }
    
    pub async fn check_health(&self) -> Result<String, BrewDeckError> {
        let command = BrewCommand::new(vec!["doctor".to_string()]);
        let result = self.execute(command).await?;
        
        Ok(result.stdout)
    }
    
    pub async fn update_homebrew(&self) -> Result<String, BrewDeckError> {
        let command = BrewCommand::new(vec!["update".to_string()]);
        let result = self.execute(command).await?;
        
        if result.success {
            Ok("Homebrew updated successfully".to_string())
        } else {
            Err(BrewDeckError::UpdateFailed(
                format!("Failed to update Homebrew: {}", result.stderr)
            ))
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, Hash, PartialEq)]
pub enum PackageType {
    Formula,
    Cask,
}

impl std::fmt::Display for PackageType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PackageType::Formula => write!(f, "formula"),
            PackageType::Cask => write!(f, "cask"),
        }
    }
}

impl std::str::FromStr for PackageType {
    type Err = BrewDeckError;
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "formula" | "formulae" => Ok(PackageType::Formula),
            "cask" | "casks" => Ok(PackageType::Cask),
            _ => Err(BrewDeckError::InvalidConfiguration(
                format!("Invalid package type: {}", s)
            )),
        }
    }
}