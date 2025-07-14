import React, { memo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  X,
  RotateCcw 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalculationState } from '@/types/stateMachine.types';

interface CalculationProgressBarProps {
  state: CalculationState;
  className?: string;
  showTimeEstimate?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  onReset?: () => void;
  estimatedTimeMs?: number;
}

const CalculationProgressBar = memo(function CalculationProgressBar({
  state,
  className,
  showTimeEstimate = true,
  onCancel,
  onRetry,
  onReset,
  estimatedTimeMs = 5000,
}: CalculationProgressBarProps) {
  const getStateConfig = () => {
    switch (state.type) {
      case 'idle':
        return {
          icon: Clock,
          label: 'Ready to calculate',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          progress: 0,
          showProgress: false,
        };
      case 'loading':
        return {
          icon: Loader2,
          label: state.operation || 'Loading...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          progress: state.progress || 10,
          showProgress: true,
          animated: true,
        };
      case 'calculating':
        return {
          icon: Loader2,
          label: state.stage || 'Calculating...',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          progress: state.progress,
          showProgress: true,
          animated: true,
        };
      case 'complete':
        return {
          icon: CheckCircle,
          label: 'Calculation complete',
          color: 'text-success',
          bgColor: 'bg-success/10',
          progress: 100,
          showProgress: true,
        };
      case 'error':
        return {
          icon: XCircle,
          label: 'Calculation failed',
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          progress: 0,
          showProgress: false,
        };
      default:
        return {
          icon: Clock,
          label: 'Unknown state',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          progress: 0,
          showProgress: false,
        };
    }
  };

  const config = getStateConfig();
  const Icon = config.icon;

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getEstimatedTimeRemaining = (): number => {
    if (state.type === 'calculating') {
      const elapsed = (state.progress / 100) * estimatedTimeMs;
      return Math.max(0, estimatedTimeMs - elapsed);
    }
    return estimatedTimeMs;
  };

  const canCancel = state.type === 'loading' || state.type === 'calculating';
  const canRetry = state.type === 'error' && state.canRetry;
  const canReset = state.type === 'complete' || state.type === 'error';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with status and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon 
            className={cn(
              'w-5 h-5',
              config.color,
              config.animated && 'animate-spin'
            )} 
          />
          <span className="text-sm font-medium">{config.label}</span>
          
          {/* Status Badge */}
          <Badge 
            variant={
              state.type === 'complete' ? 'default' :
              state.type === 'error' ? 'destructive' :
              'secondary'
            }
            className="text-xs"
          >
            {state.type.toUpperCase()}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {canCancel && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          
          {canRetry && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          
          {canReset && onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs px-2 h-7"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {config.showProgress && (
        <div className="space-y-2">
          <Progress 
            value={config.progress} 
            className="h-2"
            // Add animation for active states
            style={{
              transition: state.type === 'calculating' ? 'none' : 'all 0.3s ease-in-out'
            }}
          />
          
          {/* Progress Details */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{config.progress.toFixed(0)}% complete</span>
            
            {showTimeEstimate && (state.type === 'calculating' || state.type === 'loading') && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{formatTime(getEstimatedTimeRemaining())} remaining
              </span>
            )}
            
            {state.type === 'complete' && (
              <span className="text-success">
                ✓ Completed in {formatTime(estimatedTimeMs - getEstimatedTimeRemaining())}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Details */}
      {state.type === 'error' && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div className="space-y-1">
              <p className="font-medium">Error: {state.error}</p>
              {state.canRetry && (
                <p className="text-muted-foreground">
                  Click retry to attempt the calculation again.
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {state.type === 'complete' && (
        <div className={cn('p-2 rounded-lg border', config.bgColor)}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <p className="text-xs text-muted-foreground">
              Wind pressure calculation completed successfully at{' '}
              {new Date(state.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}

      {/* Stage Details for Calculating State */}
      {state.type === 'calculating' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>{state.stage}</span>
        </div>
      )}
    </div>
  );
});

export default CalculationProgressBar;