import React, { memo } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Info, 
  Zap, 
  Shield, 
  TrendingUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FailureScenarioToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
  disabled?: boolean;
  impactDescription?: string;
  warningMessage?: string;
  showEducationalInfo?: boolean;
}

const FailureScenarioToggle = memo(function FailureScenarioToggle({
  enabled,
  onChange,
  className,
  disabled = false,
  impactDescription,
  warningMessage,
  showEducationalInfo = true,
}: FailureScenarioToggleProps) {
  
  const defaultImpactDescription = 
    "When enabled, analysis considers potential failure of glazed openings (windows, doors) " +
    "during extreme wind events, which may change the building from enclosed to partially enclosed, " +
    "affecting internal pressure coefficients and overall wind loads.";

  const defaultWarningMessage = 
    "Enabling this scenario may result in higher design pressures. Ensure structural " +
    "adequacy for both normal and failure conditions.";

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Toggle Control */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              enabled ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
            )}>
              {enabled ? <Zap className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label 
                  htmlFor="failure-scenario" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Glazing Failure Analysis
                </Label>
                
                <Badge 
                  variant={enabled ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {enabled ? 'ACTIVE' : 'DISABLED'}
                </Badge>
                
                {showEducationalInfo && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <div className="space-y-2 text-xs">
                        <p className="font-medium">What is Glazing Failure Analysis?</p>
                        <p>
                          This analysis considers the potential failure of windows and glazed 
                          doors during extreme wind events. Failed glazing can create large 
                          openings that change the building's enclosure classification.
                        </p>
                        <p className="text-muted-foreground">
                          Per ASCE 7, this scenario is required for buildings with substantial 
                          glazed areas in high wind zones.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                Consider potential glazed opening failures in wind analysis
              </p>
            </div>
          </div>

          <Switch
            id="failure-scenario"
            checked={enabled}
            onCheckedChange={onChange}
            disabled={disabled}
            className="data-[state=checked]:bg-warning"
          />
        </div>

        {/* Impact Description */}
        {enabled && (
          <Alert className="border-warning/20 bg-warning/5">
            <TrendingUp className="h-4 w-4 text-warning" />
            <AlertDescription className="text-xs space-y-2">
              <div className="font-medium text-warning">Analysis Impact:</div>
              <p className="text-muted-foreground leading-relaxed">
                {impactDescription || defaultImpactDescription}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Warning Message */}
        {enabled && (warningMessage || defaultWarningMessage) && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <div className="space-y-1">
                <p className="font-medium">Design Consideration:</p>
                <p className="leading-relaxed">
                  {warningMessage || defaultWarningMessage}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Educational Information */}
        {showEducationalInfo && enabled && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-2">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                  ASCE 7 Requirements
                </p>
                <div className="space-y-1 text-xs text-blue-700 dark:text-blue-200">
                  <p>
                    • Buildings with glazed areas &gt; 15% of wall area may require this analysis
                  </p>
                  <p>
                    • Consider failure at 80% of design pressure for ordinary glazing
                  </p>
                  <p>
                    • Impact-resistant glazing may have different failure thresholds
                  </p>
                  <p>
                    • Resulting enclosure classification affects GCpi values significantly
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Summary */}
        {enabled && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
            <span>
              Failure scenario active - design pressures may be increased to account for potential glazing failures
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});

export default FailureScenarioToggle;