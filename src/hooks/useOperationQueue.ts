import { useCallback, useMemo } from 'react';
import { useBrewStore } from '../stores/brewStore';
import type { PackageOperation } from '../stores/brewStore';

interface BatchOperation {
  packages: Array<{
    name: string;
    packageType: 'formula' | 'cask';
  }>;
  type: 'install' | 'uninstall' | 'update';
}

interface QueueStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  estimatedTimeRemaining: number; // in seconds
}

/**
 * Custom hook for managing operation queues and batch operations
 */
export const useOperationQueue = () => {
  const {
    operations,
    addOperation,
    updateOperation,
    removeOperation,
    getActiveOperations,
    installPackage,
    uninstallPackage,
    updatePackage,
  } = useBrewStore();

  // Get queue statistics
  const getQueueStats = useCallback((): QueueStats => {
    const ops = Object.values(operations);
    const pending = ops.filter(op => op.status === 'pending');
    const running = ops.filter(op => op.status === 'running');
    const completed = ops.filter(op => op.status === 'completed');
    const failed = ops.filter(op => op.status === 'failed');

    // Estimate time remaining based on average completion time
    const completedOps = completed.filter(op => op.endTime);
    const avgDuration = completedOps.length > 0
      ? completedOps.reduce((sum, op) => {
          const duration = new Date(op.endTime!).getTime() - new Date(op.startTime).getTime();
          return sum + duration;
        }, 0) / completedOps.length
      : 30000; // Default 30 seconds

    const estimatedTimeRemaining = Math.round(
      ((pending.length + running.length) * avgDuration) / 1000
    );

    return {
      total: ops.length,
      pending: pending.length,
      running: running.length,
      completed: completed.length,
      failed: failed.length,
      estimatedTimeRemaining,
    };
  }, [operations]);

  // Execute batch operation
  const executeBatchOperation = useCallback(
    async (batchOp: BatchOperation, options?: {
      maxConcurrent?: number;
      continueOnError?: boolean;
      onProgress?: (completed: number, total: number) => void;
    }) => {
      const {
        maxConcurrent = 3,
        continueOnError = true,
        onProgress,
      } = options || {};

      const results: Array<{
        package: string;
        success: boolean;
        error?: string;
      }> = [];

      let completed = 0;
      const total = batchOp.packages.length;

      // Process packages in batches
      for (let i = 0; i < batchOp.packages.length; i += maxConcurrent) {
        const batch = batchOp.packages.slice(i, i + maxConcurrent);
        
        const batchPromises = batch.map(async (pkg) => {
          try {
            switch (batchOp.type) {
              case 'install':
                await installPackage(pkg.name, pkg.packageType);
                break;
              case 'uninstall':
                await uninstallPackage(pkg.name, pkg.packageType);
                break;
              case 'update':
                await updatePackage(pkg.name, pkg.packageType);
                break;
            }
            
            results.push({ package: pkg.name, success: true });
            completed++;
            onProgress?.(completed, total);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            results.push({ 
              package: pkg.name, 
              success: false, 
              error: errorMessage 
            });
            completed++;
            onProgress?.(completed, total);
            
            if (!continueOnError) {
              throw error;
            }
          }
        });

        await Promise.all(batchPromises);
      }

      return results;
    },
    [installPackage, uninstallPackage, updatePackage]
  );

  // Pause all pending operations
  const pauseQueue = useCallback(() => {
    const pendingOps = Object.values(operations).filter(op => op.status === 'pending');
    pendingOps.forEach(op => {
      updateOperation(op.id, { status: 'pending' }); // Keep as pending but mark as paused
    });
  }, [operations, updateOperation]);

  // Resume all paused operations
  const resumeQueue = useCallback(() => {
    // This would need additional state to track paused operations
    // For now, we'll just ensure pending operations can proceed
    const pendingOps = Object.values(operations).filter(op => op.status === 'pending');
    // Operations will naturally resume when the queue processor runs
    return pendingOps.length;
  }, [operations]);

  // Cancel all pending operations
  const cancelPendingOperations = useCallback(() => {
    const pendingOps = Object.values(operations).filter(op => op.status === 'pending');
    pendingOps.forEach(op => {
      updateOperation(op.id, { 
        status: 'failed', 
        message: 'Cancelled by user',
        endTime: new Date(),
      });
    });
    return pendingOps.length;
  }, [operations, updateOperation]);

  // Retry failed operations
  const retryFailedOperations = useCallback(async () => {
    const failedOps = Object.values(operations).filter(op => op.status === 'failed');
    
    for (const op of failedOps) {
      try {
        switch (op.type) {
          case 'install':
            await installPackage(op.packageName, op.packageType);
            break;
          case 'uninstall':
            await uninstallPackage(op.packageName, op.packageType);
            break;
          case 'update':
            await updatePackage(op.packageName, op.packageType);
            break;
        }
      } catch (error) {
        // Error will be handled by the individual operation
        console.warn(`Retry failed for ${op.packageName}:`, error);
      }
    }
    
    return failedOps.length;
  }, [operations, installPackage, uninstallPackage, updatePackage]);

  // Clear completed operations
  const clearCompletedOperations = useCallback(() => {
    const completedOps = Object.values(operations).filter(
      op => op.status === 'completed' || op.status === 'failed'
    );
    
    completedOps.forEach(op => {
      removeOperation(op.id);
    });
    
    return completedOps.length;
  }, [operations, removeOperation]);

  // Get operations by priority (running > pending > failed > completed)
  const getOperationsByPriority = useCallback(() => {
    const ops = Object.values(operations);
    
    return ops.sort((a, b) => {
      const priorityOrder = { running: 0, pending: 1, failed: 2, completed: 3 };
      const aPriority = priorityOrder[a.status];
      const bPriority = priorityOrder[b.status];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Within same status, sort by start time (newest first)
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
  }, [operations]);

  // Get operation queue health
  const getQueueHealth = useCallback(() => {
    const stats = getQueueStats();
    const totalFinished = stats.completed + stats.failed;
    const successRate = totalFinished > 0 ? (stats.completed / totalFinished) * 100 : 100;
    
    let health: 'excellent' | 'good' | 'fair' | 'poor';
    if (successRate >= 95) health = 'excellent';
    else if (successRate >= 85) health = 'good';
    else if (successRate >= 70) health = 'fair';
    else health = 'poor';
    
    return {
      health,
      successRate,
      hasStuckOperations: stats.running > 0 && getActiveOperations().some(op => {
        const duration = Date.now() - new Date(op.startTime).getTime();
        return duration > 5 * 60 * 1000; // 5 minutes
      }),
      queueLength: stats.pending + stats.running,
    };
  }, [getQueueStats, getActiveOperations]);

  // Memoized values
  const queueStats = useMemo(() => getQueueStats(), [getQueueStats]);
  const queueHealth = useMemo(() => getQueueHealth(), [getQueueHealth]);
  const operationsByPriority = useMemo(() => getOperationsByPriority(), [getOperationsByPriority]);

  return {
    // Queue state
    operations,
    activeOperations: getActiveOperations(),
    queueStats,
    queueHealth,
    operationsByPriority,
    
    // Queue operations
    executeBatchOperation,
    pauseQueue,
    resumeQueue,
    cancelPendingOperations,
    retryFailedOperations,
    clearCompletedOperations,
    
    // Queue management
    getQueueStats,
    getQueueHealth,
    getOperationsByPriority,
  };
};

export default useOperationQueue;