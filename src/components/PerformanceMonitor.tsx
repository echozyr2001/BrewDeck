import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
// import { Badge } from './ui/badge';
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import {
  Activity,
  Zap,
  HardDrive,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  // Settings
} from "lucide-react";
import {
  performanceMonitor,
  usePerformanceMonitoring,
  type PerformanceMetrics,
} from "../utils/performance";
import { bundleAnalyzer } from "../utils/bundleAnalyzer";

interface PerformanceMonitorProps {
  className?: string;
  showDetails?: boolean;
}

/**
 * Performance monitoring dashboard component
 * Only loaded when needed to avoid impacting performance
 */
const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  className = "",
  showDetails = false,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    searchResponseTime: 0,
    installationTime: 0,
    cacheHitRate: 0,
    errorRate: 0,
  });

  const [budgetStatus, setBudgetStatus] = useState<{
    passed: boolean;
    violations: string[];
  }>({ passed: true, violations: [] });

  const [isVisible, setIsVisible] = useState(false);
  const { getMetrics, checkBudget, logReport } = usePerformanceMonitoring();

  // Memoize the update function to prevent unnecessary re-creation
  const updateMetrics = useCallback(() => {
    const currentMetrics = getMetrics();
    const currentBudgetStatus = checkBudget();

    setMetrics(currentMetrics);
    setBudgetStatus(currentBudgetStatus);
  }, [getMetrics, checkBudget]);

  // Update metrics periodically
  useEffect(() => {
    // Initial update
    updateMetrics();

    // Update every 5 seconds when visible
    let interval: NodeJS.Timeout;
    if (isVisible) {
      interval = setInterval(updateMetrics, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isVisible, updateMetrics]);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatSize = (bytes?: number): string => {
    if (!bytes) return "N/A";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStatusColor = (passed: boolean): string => {
    return passed ? "text-green-600" : "text-red-600";
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4" />
    ) : (
      <AlertTriangle className="h-4 w-4" />
    );
  };

  const handleGenerateReport = () => {
    logReport();
    bundleAnalyzer.generateOptimizationReport();
  };

  if (!isVisible && !showDetails) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className={`fixed bottom-4 right-4 z-50 ${className}`}
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    );
  }

  return (
    <div className={`performance-monitor ${className}`}>
      {!showDetails && (
        <div className="fixed bottom-4 right-4 z-50 w-96">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Performance Monitor
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(false)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Overall Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Budget Status:</span>
                <div
                  className={`flex items-center gap-1 ${getStatusColor(
                    budgetStatus.passed
                  )}`}
                >
                  {getStatusIcon(budgetStatus.passed)}
                  <span className="text-sm">
                    {budgetStatus.passed ? "PASSED" : "FAILED"}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Load Time
                  </div>
                  <div className="font-mono">
                    {formatTime(metrics.loadTime)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    Search Time
                  </div>
                  <div className="font-mono">
                    {formatTime(metrics.searchResponseTime)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <HardDrive className="h-3 w-3" />
                    Cache Hit Rate
                  </div>
                  <div className="font-mono">
                    {metrics.cacheHitRate.toFixed(1)}%
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <AlertTriangle className="h-3 w-3" />
                    Error Rate
                  </div>
                  <div className="font-mono">
                    {metrics.errorRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Memory Usage */}
              {metrics.memoryUsage && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span className="font-mono">
                        {formatSize(metrics.memoryUsage * 1024 * 1024)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min((metrics.memoryUsage / 100) * 100, 100)}
                      className="h-2"
                    />
                  </div>
                </>
              )}

              {/* Budget Violations */}
              {budgetStatus.violations.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm font-medium text-red-600 mb-2">
                      Budget Violations:
                    </div>
                    <div className="space-y-1">
                      {budgetStatus.violations
                        .slice(0, 2)
                        .map((violation, index) => (
                          <div
                            key={index}
                            className="text-xs text-red-600 bg-red-50 p-2 rounded"
                          >
                            {violation}
                          </div>
                        ))}
                      {budgetStatus.violations.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{budgetStatus.violations.length - 2} more violations
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateReport}
                  className="flex-1"
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => performanceMonitor.reset()}
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showDetails && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Detailed metrics would go here */}
            <div className="text-center text-muted-foreground">
              Detailed performance dashboard coming soon...
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceMonitor;
