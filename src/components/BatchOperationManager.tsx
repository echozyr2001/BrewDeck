import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import {
  Play,
  Square,
  RefreshCw,
  Trash2,
  Package,
  AlertTriangle,
  CheckCircle,
  Settings,
} from "lucide-react";
import { useOperationQueue } from "../hooks/useOperationQueue";
import { usePackageOperations } from "../hooks/usePackageOperations";

interface BatchOperationManagerProps {
  selectedPackages?: Array<{
    name: string;
    packageType: "formula" | "cask";
  }>;
  onSelectionChange?: (
    packages: Array<{ name: string; packageType: "formula" | "cask" }>
  ) => void;
}

/**
 * Component for managing batch operations
 */
export const BatchOperationManager: React.FC<BatchOperationManagerProps> = ({
  selectedPackages = [],
  onSelectionChange,
}) => {
  const {
    queueStats,
    queueHealth,
    executeBatchOperation,
    cancelPendingOperations,
    retryFailedOperations,
    clearCompletedOperations,
  } = useOperationQueue();

  const { hasActiveOperations } = usePackageOperations();

  const [batchProgress, setBatchProgress] = useState<{
    isRunning: boolean;
    completed: number;
    total: number;
    currentOperation?: string;
  }>({
    isRunning: false,
    completed: 0,
    total: 0,
  });

  const [batchSettings, setBatchSettings] = useState({
    maxConcurrent: 3,
    continueOnError: true,
  });

  const handleBatchInstall = async () => {
    if (selectedPackages.length === 0) return;

    setBatchProgress({
      isRunning: true,
      completed: 0,
      total: selectedPackages.length,
    });

    try {
      await executeBatchOperation(
        {
          packages: selectedPackages,
          type: "install",
        },
        {
          maxConcurrent: batchSettings.maxConcurrent,
          continueOnError: batchSettings.continueOnError,
          onProgress: (completed, total) => {
            setBatchProgress((prev) => ({
              ...prev,
              completed,
              total,
            }));
          },
        }
      );
    } finally {
      setBatchProgress((prev) => ({
        ...prev,
        isRunning: false,
      }));
    }
  };

  const handleBatchUninstall = async () => {
    if (selectedPackages.length === 0) return;

    setBatchProgress({
      isRunning: true,
      completed: 0,
      total: selectedPackages.length,
    });

    try {
      await executeBatchOperation(
        {
          packages: selectedPackages,
          type: "uninstall",
        },
        {
          maxConcurrent: batchSettings.maxConcurrent,
          continueOnError: batchSettings.continueOnError,
          onProgress: (completed, total) => {
            setBatchProgress((prev) => ({
              ...prev,
              completed,
              total,
            }));
          },
        }
      );
    } finally {
      setBatchProgress((prev) => ({
        ...prev,
        isRunning: false,
      }));
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedPackages.length === 0) return;

    setBatchProgress({
      isRunning: true,
      completed: 0,
      total: selectedPackages.length,
    });

    try {
      await executeBatchOperation(
        {
          packages: selectedPackages,
          type: "update",
        },
        {
          maxConcurrent: batchSettings.maxConcurrent,
          continueOnError: batchSettings.continueOnError,
          onProgress: (completed, total) => {
            setBatchProgress((prev) => ({
              ...prev,
              completed,
              total,
            }));
          },
        }
      );
    } finally {
      setBatchProgress((prev) => ({
        ...prev,
        isRunning: false,
      }));
    }
  };

  const getHealthColor = () => {
    switch (queueHealth.health) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "fair":
        return "text-yellow-600";
      case "poor":
        return "text-red-600";
    }
  };

  const getHealthIcon = () => {
    switch (queueHealth.health) {
      case "excellent":
      case "good":
        return <CheckCircle className="h-4 w-4" />;
      case "fair":
      case "poor":
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Operation Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {queueStats.pending}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {queueStats.running}
              </p>
              <p className="text-sm text-muted-foreground">Running</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {queueStats.completed}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {queueStats.failed}
              </p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 ${getHealthColor()}`}>
                {getHealthIcon()}
                Queue Health:{" "}
                {queueHealth.health.charAt(0).toUpperCase() +
                  queueHealth.health.slice(1)}
              </span>
              <Badge variant="outline">
                {Math.round(queueHealth.successRate)}% Success Rate
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => retryFailedOperations()}
                disabled={queueStats.failed === 0}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Retry Failed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearCompletedOperations()}
                disabled={queueStats.completed === 0 && queueStats.failed === 0}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Clear History
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => cancelPendingOperations()}
                disabled={queueStats.pending === 0}
                className="flex items-center gap-1"
              >
                <Square className="h-3 w-3" />
                Cancel Pending
              </Button>
            </div>
          </div>

          {queueStats.estimatedTimeRemaining > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                Estimated time remaining:{" "}
                {Math.round(queueStats.estimatedTimeRemaining / 60)} minutes
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Operations */}
      {selectedPackages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Batch Operations ({selectedPackages.length} packages selected)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Batch Progress */}
              {batchProgress.isRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Batch Progress</span>
                    <span>
                      {batchProgress.completed} / {batchProgress.total}
                    </span>
                  </div>
                  <Progress
                    value={
                      (batchProgress.completed / batchProgress.total) * 100
                    }
                    className="h-2"
                  />
                </div>
              )}

              {/* Batch Settings */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm font-medium">Settings:</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Max Concurrent:</label>
                  <select
                    value={batchSettings.maxConcurrent}
                    onChange={(e) =>
                      setBatchSettings((prev) => ({
                        ...prev,
                        maxConcurrent: parseInt(e.target.value),
                      }))
                    }
                    className="text-sm border rounded px-2 py-1"
                    disabled={batchProgress.isRunning}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={batchSettings.continueOnError}
                    onChange={(e) =>
                      setBatchSettings((prev) => ({
                        ...prev,
                        continueOnError: e.target.checked,
                      }))
                    }
                    disabled={batchProgress.isRunning}
                  />
                  Continue on error
                </label>
              </div>

              {/* Batch Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleBatchInstall}
                  disabled={batchProgress.isRunning || hasActiveOperations()}
                  className="flex items-center gap-1"
                >
                  <Play className="h-3 w-3" />
                  Install All
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBatchUninstall}
                  disabled={batchProgress.isRunning || hasActiveOperations()}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Uninstall All
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBatchUpdate}
                  disabled={batchProgress.isRunning || hasActiveOperations()}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Update All
                </Button>
              </div>

              {/* Selected Packages Preview */}
              <div className="max-h-32 overflow-y-auto border rounded p-2">
                <p className="text-sm font-medium mb-2">Selected Packages:</p>
                <div className="space-y-1">
                  {selectedPackages.map((pkg, index) => (
                    <div
                      key={`${pkg.packageType}-${pkg.name}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{pkg.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {pkg.packageType}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BatchOperationManager;
