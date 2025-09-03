import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  TrendingUp,
  Package,
} from "lucide-react";
import { usePackageOperations } from "../hooks/usePackageOperations";
import { OperationQueue } from "./OperationProgress";
import type { PackageOperation } from "../stores/brewStore";

interface OperationStatsProps {
  operations: Record<string, PackageOperation>;
}

/**
 * Component for displaying operation statistics
 */
const OperationStats: React.FC<OperationStatsProps> = ({ operations }) => {
  const stats = React.useMemo(() => {
    const ops = Object.values(operations);

    return {
      total: ops.length,
      pending: ops.filter((op) => op.status === "pending").length,
      running: ops.filter((op) => op.status === "running").length,
      completed: ops.filter((op) => op.status === "completed").length,
      failed: ops.filter((op) => op.status === "failed").length,
      byType: {
        install: ops.filter((op) => op.type === "install").length,
        uninstall: ops.filter((op) => op.type === "uninstall").length,
        update: ops.filter((op) => op.type === "update").length,
      },
      byPackageType: {
        formula: ops.filter((op) => op.packageType === "formula").length,
        cask: ops.filter((op) => op.packageType === "cask").length,
      },
    };
  }, [operations]);

  const successRate =
    stats.total > 0
      ? Math.round(
          (stats.completed / (stats.completed + stats.failed)) * 100
        ) || 0
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-2xl font-bold">
                {stats.pending + stats.running}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm font-medium">Completed</p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm font-medium">Failed</p>
              <p className="text-2xl font-bold">{stats.failed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-sm font-medium">Success Rate</p>
              <p className="text-2xl font-bold">{successRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface OperationHistoryProps {
  operations: Record<string, PackageOperation>;
  onClearHistory: () => void;
  onRetryOperation: (operation: PackageOperation) => void;
}

/**
 * Component for displaying operation history
 */
const OperationHistory: React.FC<OperationHistoryProps> = ({
  operations,
  onClearHistory,
  onRetryOperation,
}) => {
  const [filter, setFilter] = useState<"all" | "completed" | "failed">("all");

  const filteredOperations = React.useMemo(() => {
    let ops = Object.values(operations);

    switch (filter) {
      case "completed":
        ops = ops.filter((op) => op.status === "completed");
        break;
      case "failed":
        ops = ops.filter((op) => op.status === "failed");
        break;
    }

    return ops.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [operations, filter]);

  const formatDuration = (operation: PackageOperation) => {
    if (!operation.endTime) return "In progress...";

    const start = new Date(operation.startTime).getTime();
    const end = new Date(operation.endTime).getTime();
    const duration = Math.round((end - start) / 1000);

    if (duration < 60) {
      return `${duration}s`;
    } else {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes}m ${seconds}s`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Operation History</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              {(["all", "completed", "failed"] as const).map((filterType) => (
                <Button
                  key={filterType}
                  variant={filter === filterType ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(filterType)}
                  className="rounded-none first:rounded-l-md last:rounded-r-md"
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearHistory}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredOperations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No operations found
            </p>
          ) : (
            filteredOperations.map((operation, index) => (
              <div key={operation.id}>
                <div className="flex items-center justify-between p-3 rounded-md border">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {operation.type.charAt(0).toUpperCase() +
                          operation.type.slice(1)}{" "}
                        {operation.packageName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(operation.startTime).toLocaleString()} •{" "}
                        {formatDuration(operation)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        operation.status === "completed"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : operation.status === "failed"
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-blue-100 text-blue-800 border-blue-200"
                      }
                    >
                      {operation.status}
                    </Badge>
                    {operation.status === "failed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRetryOperation(operation)}
                        className="h-6 px-2"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {operation.message && (
                  <div className="ml-7 mt-1 text-sm text-muted-foreground">
                    {operation.message}
                  </div>
                )}
                {index < filteredOperations.length - 1 && (
                  <Separator className="my-2" />
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Main component for managing operation status and progress
 */
export const OperationStatusManager: React.FC = () => {
  const { operations, hasActiveOperations } = usePackageOperations();

  const [showHistory, setShowHistory] = useState(false);

  // Auto-show history when there are completed/failed operations
  useEffect(() => {
    const completedOrFailed = Object.values(operations).filter(
      (op) => op.status === "completed" || op.status === "failed"
    );

    if (completedOrFailed.length > 0 && !hasActiveOperations) {
      setShowHistory(true);
    }
  }, [operations, hasActiveOperations]);

  const handleClearHistory = () => {
    // This would need to be implemented in the store
    // For now, we'll just hide the history
    setShowHistory(false);
  };

  const handleRetryOperation = async (operation: PackageOperation) => {
    switch (operation.type) {
    }
  };

  const hasOperations = Object.keys(operations).length > 0;

  if (!hasOperations && !hasActiveOperations) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Operation Statistics */}
      {hasOperations && <OperationStats operations={operations} />}

      {/* Active Operations Queue */}
      {
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OperationQueue
              maxVisible={10}
              showCompleted={false}
              compact={false}
            />
          </CardContent>
        </Card>
      }

      {/* Operation History Toggle */}
      {hasOperations && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            {showHistory ? "Hide" : "Show"} Operation History
          </Button>
        </div>
      )}

      {/* Operation History */}
      {showHistory && hasOperations && (
        <OperationHistory
          operations={operations}
          onClearHistory={handleClearHistory}
          onRetryOperation={handleRetryOperation}
        />
      )}
    </div>
  );
};

export default OperationStatusManager;
