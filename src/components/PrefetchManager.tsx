import React, { useEffect, useState } from 'react';
import { usePrefetchManager } from '../hooks/usePrefetchManager';
import { prefetchService } from '../services/prefetchService';

interface PrefetchManagerProps {
  className?: string;
}

export const PrefetchManager: React.FC<PrefetchManagerProps> = ({ className }) => {
  const {
    config,
    updateConfig,
    networkInfo,
    shouldPrefetch,
    prefetchStats,
    isActive,
    activeRequestCount,
    getPrefetchRecommendations,
    warmCache,
    cancelAllPrefetch,
  } = usePrefetchManager();

  const [queueStatus, setQueueStatus] = useState(prefetchService.getQueueStatus());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update queue status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setQueueStatus(prefetchService.getQueueStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const recommendations = getPrefetchRecommendations();

  const getNetworkStatusColor = () => {
    if (!networkInfo) return 'text-gray-500';
    
    switch (networkInfo.effectiveType) {
      case '4g':
        return 'text-green-600';
      case '3g':
        return 'text-yellow-600';
      case '2g':
      case 'slow-2g':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getNetworkTypeIcon = () => {
    if (!networkInfo) return '📶';
    
    switch (networkInfo.type) {
      case 'wifi':
        return '📶';
      case 'cellular':
        return '📱';
      case 'ethernet':
        return '🔌';
      default:
        return '❓';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Intelligent Prefetch Manager
        </h3>
        <div className="flex items-center space-x-2">
          {isActive && (
            <div className="flex items-center space-x-1 text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span className="text-sm">Active ({activeRequestCount})</span>
            </div>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
      </div>

      {/* Network Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Network Status</span>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getNetworkTypeIcon()}</span>
            <span className={`text-sm font-medium ${getNetworkStatusColor()}`}>
              {networkInfo?.effectiveType?.toUpperCase() || 'Unknown'}
            </span>
          </div>
        </div>
        
        {networkInfo && (
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Speed: {networkInfo.downlink} Mbps</div>
            <div>Latency: {networkInfo.rtt}ms</div>
            <div>Type: {networkInfo.type}</div>
            <div>
              Data Saver: {networkInfo.saveData ? 
                <span className="text-orange-600">On</span> : 
                <span className="text-green-600">Off</span>
              }
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-4 space-y-2">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`p-2 rounded text-sm ${
                rec.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                rec.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                'bg-green-50 text-green-800 border border-green-200'
              }`}
            >
              {rec.message}
            </div>
          ))}
        </div>
      )}

      {/* Quick Controls */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Enable Prefetching
          </label>
          <button
            onClick={() => updateConfig({ enabled: !config.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            WiFi Only
          </label>
          <button
            onClick={() => updateConfig({ wifiOnly: !config.wifiOnly })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.wifiOnly ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.wifiOnly ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Respect Data Saver
          </label>
          <button
            onClick={() => updateConfig({ respectSaveData: !config.respectSaveData })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.respectSaveData ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.respectSaveData ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Statistics</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>Total Requests: {prefetchStats.totalRequests}</div>
          <div>Success Rate: {
            prefetchStats.totalRequests > 0 
              ? Math.round((prefetchStats.successfulRequests / prefetchStats.totalRequests) * 100)
              : 0
          }%</div>
          <div>Queue: {queueStatus.queued}</div>
          <div>Active: {queueStatus.active}</div>
          <div>Avg Response: {Math.round(prefetchStats.averageResponseTime)}ms</div>
          <div>Data Transferred: {formatBytes(prefetchStats.bytesTransferred)}</div>
        </div>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700">Advanced Settings</h4>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Max Concurrent Requests: {config.maxConcurrentRequests}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={config.maxConcurrentRequests}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                updateConfig({ maxConcurrentRequests: value });
                prefetchService.updateMaxConcurrentRequests(value);
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Popularity Threshold: {config.popularityThreshold}
            </label>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={config.popularityThreshold}
              onChange={(e) => updateConfig({ popularityThreshold: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">Cache Warming</label>
              <button
                onClick={() => updateConfig({ cacheWarmingEnabled: !config.cacheWarmingEnabled })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.cacheWarmingEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    config.cacheWarmingEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">Predictive Prefetch</label>
              <button
                onClick={() => updateConfig({ predictiveEnabled: !config.predictiveEnabled })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.predictiveEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    config.predictiveEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">Background Refresh</label>
              <button
                onClick={() => updateConfig({ backgroundRefreshEnabled: !config.backgroundRefreshEnabled })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.backgroundRefreshEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    config.backgroundRefreshEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={warmCache}
              disabled={!shouldPrefetch}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Warm Cache Now
            </button>
            <button
              onClick={cancelAllPrefetch}
              className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cancel All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrefetchManager;