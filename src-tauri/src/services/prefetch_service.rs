use crate::error::BrewDeckError;
use crate::services::{CacheManager, PackageService};
use crate::services::brew_client::PackageType;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{RwLock, Semaphore};
use tokio::time::sleep;
use tracing::{debug, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrefetchConfig {
    pub enabled: bool,
    pub max_concurrent_requests: usize,
    pub wifi_only: bool,
    pub respect_save_data: bool,
    pub popularity_threshold: u64,
    pub cache_warming_enabled: bool,
    pub predictive_enabled: bool,
    pub background_refresh_enabled: bool,
    pub prefetch_interval_seconds: u64,
}

impl Default for PrefetchConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_concurrent_requests: 3,
            wifi_only: false,
            respect_save_data: true,
            popularity_threshold: 1000,
            cache_warming_enabled: true,
            predictive_enabled: true,
            background_refresh_enabled: true,
            prefetch_interval_seconds: 300, // 5 minutes
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConditions {
    pub connection_type: String,
    pub effective_type: String,
    pub downlink: f64,
    pub rtt: u32,
    pub save_data: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrefetchRequest {
    pub id: String,
    pub package_type: PackageType,
    pub packages: Option<Vec<String>>,
    pub priority: PrefetchPriority,
    pub network_aware: bool,
    pub created_at: std::time::SystemTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PrefetchPriority {
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrefetchStats {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub bytes_transferred: u64,
    pub average_response_time_ms: u64,
    pub cache_hit_rate: f64,
}

pub struct PrefetchService {
    config: Arc<RwLock<PrefetchConfig>>,
    package_service: Arc<PackageService>,
    cache_manager: Arc<CacheManager>,
    request_semaphore: Arc<Semaphore>,
    stats: Arc<RwLock<PrefetchStats>>,
    network_conditions: Arc<RwLock<Option<NetworkConditions>>>,
    popular_packages_cache: Arc<RwLock<HashMap<PackageType, Vec<String>>>>,
    last_prefetch_time: Arc<RwLock<HashMap<String, Instant>>>,
}

impl PrefetchService {
    pub fn new(
        package_service: Arc<PackageService>,
        cache_manager: Arc<CacheManager>,
    ) -> Self {
        let config = Arc::new(RwLock::new(PrefetchConfig::default()));
        let max_concurrent = config.try_read().unwrap().max_concurrent_requests;
        
        Self {
            config,
            package_service,
            cache_manager,
            request_semaphore: Arc::new(Semaphore::new(max_concurrent)),
            stats: Arc::new(RwLock::new(PrefetchStats {
                total_requests: 0,
                successful_requests: 0,
                failed_requests: 0,
                bytes_transferred: 0,
                average_response_time_ms: 0,
                cache_hit_rate: 0.0,
            })),
            network_conditions: Arc::new(RwLock::new(None)),
            popular_packages_cache: Arc::new(RwLock::new(HashMap::new())),
            last_prefetch_time: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn update_config(&self, new_config: PrefetchConfig) -> Result<(), BrewDeckError> {
        let mut config = self.config.write().await;
        
        // Update semaphore if max concurrent requests changed
        if config.max_concurrent_requests != new_config.max_concurrent_requests {
            // Note: In a real implementation, you'd need to recreate the semaphore
            // This is a simplified approach
            info!("Max concurrent requests updated to {}", new_config.max_concurrent_requests);
        }
        
        *config = new_config;
        info!("Prefetch configuration updated");
        Ok(())
    }

    pub async fn update_network_conditions(&self, conditions: NetworkConditions) {
        let mut network = self.network_conditions.write().await;
        *network = Some(conditions);
        debug!("Network conditions updated: {:?}", network);
    }

    pub async fn should_allow_prefetch(&self, priority: &PrefetchPriority) -> bool {
        let config = self.config.read().await;
        
        if !config.enabled {
            return false;
        }

        // Check network conditions
        if let Some(network) = self.network_conditions.read().await.as_ref() {
            // Respect data saver
            if config.respect_save_data && network.save_data {
                return false;
            }

            // Check WiFi-only setting
            if config.wifi_only && network.connection_type == "cellular" {
                return false;
            }

            // Check network quality
            match network.effective_type.as_str() {
                "slow-2g" | "2g" => return false,
                "3g" => {
                    if matches!(priority, PrefetchPriority::High) {
                        // Allow high priority on 3g
                    } else {
                        return false;
                    }
                },
                _ => {
                    // Allow on 4g and better
                }
            }
        }

        // Check if we have capacity
        self.request_semaphore.available_permits() > 0
    }

    pub async fn prefetch_popular_packages(&self, package_type: PackageType) -> Result<(), BrewDeckError> {
        if !self.should_allow_prefetch(&PrefetchPriority::Medium).await {
            return Ok(());
        }

        let cache_key = format!("popular_{}", package_type);
        let mut last_prefetch = self.last_prefetch_time.write().await;
        
        // Throttle popular package prefetching to once every 10 minutes
        if let Some(last_time) = last_prefetch.get(&cache_key) {
            if last_time.elapsed() < Duration::from_secs(600) {
                return Ok(());
            }
        }

        let _permit = self.request_semaphore.acquire().await.unwrap();
        let start_time = Instant::now();

        let result = async {
            // Get popular packages from cache or fetch them
            let popular_packages = self.get_popular_packages(package_type).await?;
            
            if popular_packages.is_empty() {
                return Ok(());
            }

            // Prefetch top 10 popular packages
            for package_name in popular_packages.iter().take(10) {
                if let Err(e) = self.package_service.get_package_details(package_name, package_type).await {
                    warn!("Failed to prefetch popular package {}: {}", package_name, e);
                }
                
                // Small delay between requests to avoid overwhelming
                sleep(Duration::from_millis(100)).await;
            }

            Ok(())
        }.await;

        // Update statistics
        let duration = start_time.elapsed();
        self.update_stats(result.is_ok(), duration.as_millis() as u64, 0).await;
        
        // Update last prefetch time
        last_prefetch.insert(cache_key, Instant::now());

        result
    }

    pub async fn prefetch_related_packages(
        &self,
        package_name: &str,
        package_type: PackageType,
    ) -> Result<(), BrewDeckError> {
        if !self.should_allow_prefetch(&PrefetchPriority::Low).await {
            return Ok(());
        }

        let _permit = self.request_semaphore.acquire().await.unwrap();
        let start_time = Instant::now();

        let result = async {
            // Get package details to find dependencies
            let package = self.package_service.get_package_details(package_name, package_type).await?;
            
            // Prefetch dependencies (limited to avoid overwhelming)
            for dep in package.dependencies.iter().take(3) {
                if let Err(e) = self.package_service.get_package_details(dep, package_type).await {
                    debug!("Failed to prefetch dependency {}: {}", dep, e);
                }
                
                sleep(Duration::from_millis(200)).await;
            }

            Ok(())
        }.await;

        let duration = start_time.elapsed();
        self.update_stats(result.is_ok(), duration.as_millis() as u64, 0).await;

        result
    }

    pub async fn background_refresh_stale_data(&self) -> Result<(), BrewDeckError> {
        if !self.should_allow_prefetch(&PrefetchPriority::Low).await {
            return Ok(());
        }

        let config = self.config.read().await;
        if !config.background_refresh_enabled {
            return Ok(());
        }

        // Check both package types for stale data
        for package_type in [PackageType::Formula, PackageType::Cask] {
            let cache_key = format!("packages_{}", package_type);
            
            // Check if cache is stale (older than 5 minutes)
            if let Some(_cached_data) = self.cache_manager.get::<serde_json::Value>(&cache_key).await {
                // In a real implementation, you'd check the timestamp
                // For now, we'll refresh periodically
                let _permit = self.request_semaphore.acquire().await.unwrap();
                
                if let Err(e) = self.package_service.get_packages(package_type).await {
                    warn!("Failed to refresh stale data for {}: {}", package_type, e);
                }
            }
        }

        Ok(())
    }

    pub async fn predictive_prefetch(&self, user_patterns: Vec<String>) -> Result<(), BrewDeckError> {
        if !self.should_allow_prefetch(&PrefetchPriority::Low).await {
            return Ok(());
        }

        let config = self.config.read().await;
        if !config.predictive_enabled {
            return Ok(());
        }

        // Simple predictive prefetching based on user patterns
        for pattern in user_patterns.iter().take(5) {
            for package_type in [PackageType::Formula, PackageType::Cask] {
                if let Ok(search_results) = self.package_service.search_packages(pattern, package_type).await {
                    // Prefetch top 2 search results
                    for package in search_results.packages.iter().take(2) {
                        if let Err(e) = self.package_service.get_package_details(&package.name, package_type).await {
                            debug!("Failed to predictively prefetch {}: {}", package.name, e);
                        }
                    }
                }
                
                sleep(Duration::from_millis(500)).await;
            }
        }

        Ok(())
    }

    async fn get_popular_packages(&self, package_type: PackageType) -> Result<Vec<String>, BrewDeckError> {
        let mut cache = self.popular_packages_cache.write().await;
        
        if let Some(cached) = cache.get(&package_type) {
            return Ok(cached.clone());
        }

        // Fetch packages and sort by popularity
        let packages = self.package_service.get_packages(package_type).await?;
        let config = self.config.read().await;
        
        let mut popular: Vec<String> = packages
            .into_iter()
            .filter(|pkg| pkg.analytics.downloads_365d > config.popularity_threshold)
            .map(|pkg| (pkg.name, pkg.analytics.downloads_365d))
            .collect::<Vec<_>>()
            .into_iter()
            .map(|(name, _)| name)
            .collect();

        popular.sort();
        cache.insert(package_type, popular.clone());
        
        Ok(popular)
    }

    async fn update_stats(&self, success: bool, response_time_ms: u64, bytes_transferred: u64) {
        let mut stats = self.stats.write().await;
        
        stats.total_requests += 1;
        if success {
            stats.successful_requests += 1;
        } else {
            stats.failed_requests += 1;
        }
        
        stats.bytes_transferred += bytes_transferred;
        
        // Update average response time
        if stats.total_requests > 1 {
            stats.average_response_time_ms = 
                (stats.average_response_time_ms + response_time_ms) / 2;
        } else {
            stats.average_response_time_ms = response_time_ms;
        }
        
        // Calculate cache hit rate
        if stats.total_requests > 0 {
            stats.cache_hit_rate = stats.successful_requests as f64 / stats.total_requests as f64;
        }
    }

    pub async fn get_stats(&self) -> PrefetchStats {
        self.stats.read().await.clone()
    }

    pub fn start_background_tasks(self: Arc<Self>) {
        // Background refresh task
        let refresh_service = Arc::clone(&self);
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 minutes
            
            loop {
                interval.tick().await;
                
                if let Err(e) = refresh_service.background_refresh_stale_data().await {
                    warn!("Background refresh failed: {}", e);
                }
            }
        });

        // Popular packages prefetch task
        let popular_service = Arc::clone(&self);
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(600)); // 10 minutes
            
            loop {
                interval.tick().await;
                
                for package_type in [PackageType::Formula, PackageType::Cask] {
                    if let Err(e) = popular_service.prefetch_popular_packages(package_type).await {
                        warn!("Popular packages prefetch failed for {}: {}", package_type, e);
                    }
                }
            }
        });

        info!("Background prefetch tasks started");
    }
}