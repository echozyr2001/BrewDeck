use crate::error::BrewDeckError;
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry<T> {
    pub data: T,
    pub created_at: DateTime<Utc>,
    pub ttl: Duration,
    pub access_count: u64,
    pub last_accessed: DateTime<Utc>,
    pub tags: Vec<String>,
}

impl<T> CacheEntry<T> {
    pub fn new(data: T, ttl: Duration) -> Self {
        let now = Utc::now();
        Self {
            data,
            created_at: now,
            ttl,
            access_count: 0,
            last_accessed: now,
            tags: Vec::new(),
        }
    }
    
    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }
    
    pub fn is_expired(&self) -> bool {
        let now = Utc::now();
        let expiry = self.created_at + chrono::Duration::from_std(self.ttl).unwrap_or_default();
        now > expiry
    }
    
    pub fn access(&mut self) {
        self.access_count += 1;
        self.last_accessed = Utc::now();
    }
    
    pub fn age(&self) -> Duration {
        let now = Utc::now();
        let duration = now - self.created_at;
        Duration::from_secs(duration.num_seconds().max(0) as u64)
    }
}

#[derive(Debug, Clone)]
pub struct CacheConfig {
    pub default_ttl: Duration,
    pub max_entries: usize,
    pub cleanup_interval: Duration,
    pub strategy: EvictionStrategy,
    pub persistence_enabled: bool,
    pub persistence_path: Option<String>,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            default_ttl: Duration::from_secs(300), // 5 minutes
            max_entries: 1000,
            cleanup_interval: Duration::from_secs(60), // 1 minute
            strategy: EvictionStrategy::LeastRecentlyUsed,
            persistence_enabled: true,
            persistence_path: None,
        }
    }
}

#[derive(Debug, Clone)]
pub enum EvictionStrategy {
    LeastRecentlyUsed,
    LeastFrequentlyUsed,
    FirstInFirstOut,
    TimeToLive,
}

pub struct CacheManager {
    storage: Arc<DashMap<String, CacheEntry<serde_json::Value>>>,
    config: CacheConfig,
    background_tasks: Arc<RwLock<Vec<tokio::task::JoinHandle<()>>>>,
}

impl CacheManager {
    pub fn new(config: CacheConfig) -> Self {
        let cache_manager = Self {
            storage: Arc::new(DashMap::new()),
            config,
            background_tasks: Arc::new(RwLock::new(Vec::new())),
        };
        
        cache_manager.start_background_cleanup();
        cache_manager
    }
    
    pub async fn get<T>(&self, key: &str) -> Option<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let mut entry = self.storage.get_mut(key)?;
        
        if entry.is_expired() {
            debug!("Cache entry expired for key: {}", key);
            drop(entry);
            self.storage.remove(key);
            return None;
        }
        
        entry.access();
        
        match serde_json::from_value(entry.data.clone()) {
            Ok(data) => {
                debug!("Cache hit for key: {}", key);
                Some(data)
            }
            Err(e) => {
                warn!("Failed to deserialize cached data for key {}: {}", key, e);
                drop(entry);
                self.storage.remove(key);
                None
            }
        }
    }
    
    pub async fn set<T>(&self, key: &str, value: T, ttl: Option<Duration>) -> Result<(), BrewDeckError>
    where
        T: Serialize,
    {
        let ttl = ttl.unwrap_or(self.config.default_ttl);
        let serialized = serde_json::to_value(value)
            .map_err(|e| BrewDeckError::SerializationError(e.to_string()))?;
        
        let entry = CacheEntry::new(serialized, ttl);
        
        // Check if we need to evict entries
        if self.storage.len() >= self.config.max_entries {
            self.evict_entries().await;
        }
        
        self.storage.insert(key.to_string(), entry);
        debug!("Cached data for key: {} with TTL: {:?}", key, ttl);
        
        Ok(())
    }
    
    pub async fn set_with_tags<T>(&self, key: &str, value: T, ttl: Option<Duration>, tags: Vec<String>) -> Result<(), BrewDeckError>
    where
        T: Serialize,
    {
        let ttl = ttl.unwrap_or(self.config.default_ttl);
        let serialized = serde_json::to_value(value)
            .map_err(|e| BrewDeckError::SerializationError(e.to_string()))?;
        
        let entry = CacheEntry::new(serialized, ttl).with_tags(tags.clone());
        
        // Check if we need to evict entries
        if self.storage.len() >= self.config.max_entries {
            self.evict_entries().await;
        }
        
        self.storage.insert(key.to_string(), entry);
        debug!("Cached data for key: {} with TTL: {:?} and tags: {:?}", key, ttl, tags);
        
        Ok(())
    }
    
    pub async fn invalidate(&self, key: &str) -> bool {
        match self.storage.remove(key) {
            Some(_) => {
                debug!("Invalidated cache entry for key: {}", key);
                true
            }
            None => {
                debug!("No cache entry found for key: {}", key);
                false
            }
        }
    }
    
    pub async fn invalidate_pattern(&self, pattern: &str) -> usize {
        let keys_to_remove: Vec<String> = self.storage
            .iter()
            .filter(|entry| {
                let key = entry.key();
                key.contains(pattern) || 
                key.starts_with(pattern) ||
                glob_match(pattern, key)
            })
            .map(|entry| entry.key().clone())
            .collect();
        
        let count = keys_to_remove.len();
        for key in keys_to_remove {
            self.storage.remove(&key);
        }
        
        debug!("Invalidated {} cache entries matching pattern: {}", count, pattern);
        count
    }
    
    pub async fn invalidate_by_tags(&self, tags: &[String]) -> usize {
        let keys_to_remove: Vec<String> = self.storage
            .iter()
            .filter(|entry| {
                entry.value().tags.iter().any(|tag| tags.contains(tag))
            })
            .map(|entry| entry.key().clone())
            .collect();
        
        let count = keys_to_remove.len();
        for key in keys_to_remove {
            self.storage.remove(&key);
        }
        
        debug!("Invalidated {} cache entries with tags: {:?}", count, tags);
        count
    }
    
    pub async fn clear(&self) {
        let count = self.storage.len();
        self.storage.clear();
        info!("Cleared all {} cache entries", count);
    }
    
    pub async fn size(&self) -> usize {
        self.storage.len()
    }
    
    pub async fn stats(&self) -> CacheStats {
        let mut total_access_count = 0;
        let mut expired_count = 0;
        let mut total_age = Duration::ZERO;
        let entry_count = self.storage.len();
        
        for entry in self.storage.iter() {
            total_access_count += entry.value().access_count;
            if entry.value().is_expired() {
                expired_count += 1;
            }
            total_age += entry.value().age();
        }
        
        CacheStats {
            entry_count,
            expired_count,
            total_access_count,
            average_age: if entry_count > 0 {
                total_age / entry_count as u32
            } else {
                Duration::ZERO
            },
            hit_rate: 0.0, // This would need to be tracked separately
        }
    }
    
    async fn evict_entries(&self) {
        let entries_to_remove = match self.config.strategy {
            EvictionStrategy::LeastRecentlyUsed => {
                self.get_lru_entries(self.config.max_entries / 10) // Remove 10%
            }
            EvictionStrategy::LeastFrequentlyUsed => {
                self.get_lfu_entries(self.config.max_entries / 10)
            }
            EvictionStrategy::FirstInFirstOut => {
                self.get_fifo_entries(self.config.max_entries / 10)
            }
            EvictionStrategy::TimeToLive => {
                self.get_expired_entries()
            }
        };
        
        let count = entries_to_remove.len();
        for key in entries_to_remove {
            self.storage.remove(&key);
        }
        
        debug!("Evicted {} cache entries using {:?} strategy", count, self.config.strategy);
    }
    
    fn get_lru_entries(&self, count: usize) -> Vec<String> {
        let mut entries: Vec<_> = self.storage
            .iter()
            .map(|entry| (entry.key().clone(), entry.value().last_accessed))
            .collect();
        
        entries.sort_by(|a, b| a.1.cmp(&b.1));
        entries.into_iter().take(count).map(|(key, _)| key).collect()
    }
    
    fn get_lfu_entries(&self, count: usize) -> Vec<String> {
        let mut entries: Vec<_> = self.storage
            .iter()
            .map(|entry| (entry.key().clone(), entry.value().access_count))
            .collect();
        
        entries.sort_by(|a, b| a.1.cmp(&b.1));
        entries.into_iter().take(count).map(|(key, _)| key).collect()
    }
    
    fn get_fifo_entries(&self, count: usize) -> Vec<String> {
        let mut entries: Vec<_> = self.storage
            .iter()
            .map(|entry| (entry.key().clone(), entry.value().created_at))
            .collect();
        
        entries.sort_by(|a, b| a.1.cmp(&b.1));
        entries.into_iter().take(count).map(|(key, _)| key).collect()
    }
    
    fn get_expired_entries(&self) -> Vec<String> {
        self.storage
            .iter()
            .filter(|entry| entry.value().is_expired())
            .map(|entry| entry.key().clone())
            .collect()
    }
    
    fn start_background_cleanup(&self) {
        let storage = Arc::clone(&self.storage);
        let cleanup_interval = self.config.cleanup_interval;
        
        let cleanup_task = tokio::spawn(async move {
            let mut interval = tokio::time::interval(cleanup_interval);
            
            loop {
                interval.tick().await;
                
                let expired_keys: Vec<String> = storage
                    .iter()
                    .filter(|entry| entry.value().is_expired())
                    .map(|entry| entry.key().clone())
                    .collect();
                
                let count = expired_keys.len();
                for key in expired_keys {
                    storage.remove(&key);
                }
                
                if count > 0 {
                    debug!("Background cleanup removed {} expired cache entries", count);
                }
            }
        });
        
        // Store the task handle for cleanup on drop
        tokio::spawn(async move {
            // This is a simplified approach - in a real implementation,
            // you'd want to properly manage the task lifecycle
            let _ = cleanup_task.await;
        });
    }
    
    pub async fn refresh_in_background<F, Fut, T>(&self, key: &str, refresh_fn: F) -> Result<(), BrewDeckError>
    where
        F: FnOnce() -> Fut + Send + 'static,
        Fut: std::future::Future<Output = Result<T, BrewDeckError>> + Send,
        T: Serialize + Send + 'static,
    {
        let storage = Arc::clone(&self.storage);
        let key = key.to_string();
        let default_ttl = self.config.default_ttl;
        
        tokio::spawn(async move {
            match refresh_fn().await {
                Ok(data) => {
                    if let Ok(serialized) = serde_json::to_value(data) {
                        let entry = CacheEntry::new(serialized, default_ttl);
                        storage.insert(key.clone(), entry);
                        debug!("Background refresh completed for key: {}", key);
                    }
                }
                Err(e) => {
                    warn!("Background refresh failed for key {}: {}", key, e);
                }
            }
        });
        
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CacheStats {
    pub entry_count: usize,
    pub expired_count: usize,
    pub total_access_count: u64,
    pub average_age: Duration,
    pub hit_rate: f64,
}

// Simple glob matching for cache key patterns
fn glob_match(pattern: &str, text: &str) -> bool {
    if pattern.is_empty() {
        return text.is_empty();
    }
    
    if pattern == "*" {
        return true;
    }
    
    // Simple wildcard matching - in production, you might want to use a proper glob library
    if pattern.contains('*') {
        let parts: Vec<&str> = pattern.split('*').collect();
        if parts.len() == 2 {
            let prefix = parts[0];
            let suffix = parts[1];
            return text.starts_with(prefix) && text.ends_with(suffix);
        }
    }
    
    pattern == text
}