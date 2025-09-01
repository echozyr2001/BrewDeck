use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum BrewDeckError {
    #[error("Homebrew not found: {0}")]
    HomebrewNotFound(String),
    
    #[error("Package not found: {0}")]
    PackageNotFound(String),
    
    #[error("Installation failed: {0}")]
    InstallationFailed(String),
    
    #[error("Uninstallation failed: {0}")]
    UninstallationFailed(String),
    
    #[error("Update failed: {0}")]
    UpdateFailed(String),
    
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("Cache error: {0}")]
    CacheError(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("Command execution failed: {0}")]
    CommandExecutionFailed(String),
    
    #[error("Parsing error: {0}")]
    ParsingError(String),
    
    #[error("IO error: {0}")]
    IoError(String),
    
    #[error("Serialization error: {0}")]
    SerializationError(String),
    
    #[error("Timeout error: {0}")]
    TimeoutError(String),
    
    #[error("Rate limit exceeded: {0}")]
    RateLimitExceeded(String),
    
    #[error("Invalid configuration: {0}")]
    InvalidConfiguration(String),
    
    #[error("Internal error: {0}")]
    InternalError(String),
}

impl From<reqwest::Error> for BrewDeckError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            BrewDeckError::TimeoutError(err.to_string())
        } else if err.is_connect() {
            BrewDeckError::NetworkError(format!("Connection failed: {err}"))
        } else if err.is_status() {
            if let Some(status) = err.status() {
                if status == 429 {
                    BrewDeckError::RateLimitExceeded(err.to_string())
                } else {
                    BrewDeckError::NetworkError(format!("HTTP {status}: {err}"))
                }
            } else {
                BrewDeckError::NetworkError(err.to_string())
            }
        } else {
            BrewDeckError::NetworkError(err.to_string())
        }
    }
}

impl From<std::io::Error> for BrewDeckError {
    fn from(err: std::io::Error) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => BrewDeckError::HomebrewNotFound(err.to_string()),
            std::io::ErrorKind::PermissionDenied => BrewDeckError::PermissionDenied(err.to_string()),
            std::io::ErrorKind::TimedOut => BrewDeckError::TimeoutError(err.to_string()),
            _ => BrewDeckError::IoError(err.to_string()),
        }
    }
}

impl From<serde_json::Error> for BrewDeckError {
    fn from(err: serde_json::Error) -> Self {
        BrewDeckError::SerializationError(err.to_string())
    }
}

/// Error recovery strategies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorRecovery {
    pub can_retry: bool,
    pub retry_count: u32,
    pub max_retries: u32,
    pub backoff_ms: u64,
    pub fallback_available: bool,
}

impl ErrorRecovery {
    pub fn new() -> Self {
        Self {
            can_retry: true,
            retry_count: 0,
            max_retries: 3,
            backoff_ms: 1000,
            fallback_available: false,
        }
    }
    
    pub fn with_max_retries(mut self, max_retries: u32) -> Self {
        self.max_retries = max_retries;
        self
    }
    
    pub fn with_backoff(mut self, backoff_ms: u64) -> Self {
        self.backoff_ms = backoff_ms;
        self
    }
    
    pub fn with_fallback(mut self) -> Self {
        self.fallback_available = true;
        self
    }
    
    pub fn no_retry(mut self) -> Self {
        self.can_retry = false;
        self.max_retries = 0;
        self
    }
    
    pub fn should_retry(&self) -> bool {
        self.can_retry && self.retry_count < self.max_retries
    }
    
    pub fn increment_retry(&mut self) {
        self.retry_count += 1;
    }
    
    pub fn get_backoff_duration(&self) -> std::time::Duration {
        // Exponential backoff
        let backoff = self.backoff_ms * (2_u64.pow(self.retry_count));
        std::time::Duration::from_millis(backoff.min(30000)) // Max 30 seconds
    }
}

/// Enhanced error result with recovery information
#[derive(Debug, Serialize, Deserialize)]
pub struct BrewDeckResult<T> {
    pub result: Result<T, BrewDeckError>,
    pub recovery: Option<ErrorRecovery>,
}

impl<T> BrewDeckResult<T> {
    pub fn ok(value: T) -> Self {
        Self {
            result: Ok(value),
            recovery: None,
        }
    }
    
    pub fn error(error: BrewDeckError) -> Self {
        Self {
            result: Err(error),
            recovery: Some(ErrorRecovery::new()),
        }
    }
    
    pub fn error_with_recovery(error: BrewDeckError, recovery: ErrorRecovery) -> Self {
        Self {
            result: Err(error),
            recovery: Some(recovery),
        }
    }
}

/// Retry mechanism for operations
pub async fn retry_with_backoff<F, Fut, T>(
    mut operation: F,
    mut recovery: ErrorRecovery,
) -> Result<T, BrewDeckError>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<T, BrewDeckError>>,
{
    loop {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(error) => {
                if !recovery.should_retry() {
                    return Err(error);
                }
                
                let backoff = recovery.get_backoff_duration();
                recovery.increment_retry();
                
                tracing::warn!(
                    "Operation failed, retrying in {:?} (attempt {}/{}): {}",
                    backoff,
                    recovery.retry_count,
                    recovery.max_retries,
                    error
                );
                
                tokio::time::sleep(backoff).await;
            }
        }
    }
}

/// Graceful degradation helper
pub async fn with_fallback<F, Fut, T, FB, FutB>(
    primary: F,
    fallback: FB,
) -> Result<T, BrewDeckError>
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<T, BrewDeckError>>,
    FB: FnOnce() -> FutB,
    FutB: std::future::Future<Output = Result<T, BrewDeckError>>,
{
    match primary().await {
        Ok(result) => Ok(result),
        Err(primary_error) => {
            tracing::warn!("Primary operation failed, trying fallback: {}", primary_error);
            match fallback().await {
                Ok(result) => {
                    tracing::info!("Fallback operation succeeded");
                    Ok(result)
                }
                Err(fallback_error) => {
                    tracing::error!("Both primary and fallback operations failed");
                    tracing::error!("Primary error: {}", primary_error);
                    tracing::error!("Fallback error: {}", fallback_error);
                    Err(primary_error) // Return the original error
                }
            }
        }
    }
}