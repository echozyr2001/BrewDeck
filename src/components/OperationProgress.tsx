import React from 'react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, Clock, Loader2, X } from 'lucide-react';
import { usePackageOperations } from '../hooks/usePackageOperations';
import type { PackageOperation } from '../stores/brewStore';

interface OperationProgressProps {
  operation: PackageOperation;
  onDismiss?: (operationId: string) => void;
  compact?: boolean;
}

/**
 * Component for displaying individual operation progress
 */
export const OperationProgress: React.FC<OperationProgressProps> = ({
  operation,
  onDismiss,
  compact = false,
}) => {
  const getStatusIcon = () => {
    switch (operation.status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (operation.status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getOperationText = () => {
    const action = operation.type.charAt(0).toUpperCase() + operation.type.slice(1);
    const packageName = operation.packageName.startsWith('all-') 
      ? `all ${operation.packageType} packages`
      : operation.packageName;
    
    return `${action} ${packageName}`;
  };

  const getDuration = () => {
    const start = new Date(operation.startTime).getTime();
    const end = operation.endTime ? new Date(operation.endTime).getTime() : Date.now();
    const duration = Math.round((end - start) / 1000);
    
    if (duration < 60) {
      return `${duration}s`;
    } else {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes}m ${seconds}s`;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md border bg-card">
        {getStatusIcon()}
        <span className="text-sm font-medium flex-1">{getOperationText()}</span>
        <Badge variant="outline" className={getStatusColor()}>
          {operation.status}
        </Badge>
        {operation.progress !== undefined && (
          <div className="w-16">
            <Progress value={operation.progress} className="h-2" />
          </div>
        )}
        {onDismiss && (operation.status === 'completed' || operation.status === 'failed') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(operation.id)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getStatusIcon()}
            {getOperationText()}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor()}>
              {operation.status}
            </Badge>
            {onDismiss && (operation.status === 'completed' || operation.status === 'failed') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(operation.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {operation.progress !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{operation.progress}%</span>
              </div>
              <Progress value={operation.progress} className="h-2" />
            </div>
          )}
          
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Duration</span>
            <span>{getDuration()}</span>
          </div>
          
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Package Type</span>
            <span className="capitalize">{operation.packageType}</span>
          </div>
          
          {operation.message && (
            <div className="text-sm">
              <span className="text-muted-foreground">Message: </span>
              <span className={operation.status === 'failed' ? 'text-red-600' : 'text-green-600'}>
                {operation.message}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface OperationQueueProps {
  maxVisible?: number;
  showCompleted?: boolean;
  compact?: boolean;
}

/**
 * Component for displaying the operation queue
 */
export const OperationQueue: React.FC<OperationQueueProps> = ({
  maxVisible = 5,
  showCompleted = true,
  compact = true,
}) => {
  const { operations, activeOperations } = usePackageOperations();

  const visibleOperations = React.useMemo(() => {
    let ops = Object.values(operations);
    
    if (!showCompleted) {
      ops = ops.filter(op => op.status === 'pending' || op.status === 'running');
    }
    
    // Sort by start time (newest first)
    ops.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
    return ops.slice(0, maxVisible);
  }, [operations, showCompleted, maxVisible]);

  if (visibleOperations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Operations {activeOperations.length > 0 && `(${activeOperations.length} active)`}
        </h3>
        {Object.keys(operations).length > maxVisible && (
          <span className="text-xs text-muted-foreground">
            Showing {visibleOperations.length} of {Object.keys(operations).length}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {visibleOperations.map((operation) => (
          <OperationProgress
            key={operation.id}
            operation={operation}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
};

export default OperationProgress;