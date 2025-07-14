import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, Info, ChevronDown, ChevronUp, Building, Wind, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EnclosureClassification {
  type: 'enclosed' | 'partially_enclosed' | 'open';
  ratio: number;
  warnings: string[];
  gcpi_positive: number;
  gcpi_negative: number;
  failureScenarioActive?: boolean;
}

interface EnclosureClassificationBadgeProps {
  classification: EnclosureClassification | null;
  className?: string;
  showDetails?: boolean;
  onDetailsToggle?: (open: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

const EnclosureClassificationBadge = memo(function EnclosureClassificationBadge({
  classification,
  className,
  showDetails = false,
  onDetailsToggle,
  size = 'md',
}: EnclosureClassificationBadgeProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!classification) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        <Building className="w-3 h-3 mr-1" />
        Not Classified
      </Badge>
    );
  }

  const getEnclosureConfig = () => {
    switch (classification.type) {
      case 'enclosed':
        return {
          variant: 'default' as const,
          icon: Shield,
          label: 'Enclosed Building',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          description: 'Building with minimal openings, providing good wind protection.',
        };
      case 'partially_enclosed':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          label: 'Partially Enclosed',
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          description: 'Building with significant openings on one or more sides.',
        };
      case 'open':
        return {
          variant: 'destructive' as const,
          icon: Wind,
          label: 'Open Building',
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          description: 'Building with large openings allowing substantial wind flow.',
        };
      default:
        return {
          variant: 'outline' as const,
          icon: Building,
          label: 'Unknown',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          description: 'Enclosure classification not determined.',
        };
    }
  };

  const config = getEnclosureConfig();
  const Icon = config.icon;
  const hasWarnings = classification.warnings.length > 0;
  const hasFailureScenario = classification.failureScenarioActive;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    onDetailsToggle?.(!isOpen);
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <TooltipProvider>
      <div className={cn('space-y-2', className)}>
        {/* Main Badge */}
        <div className="flex items-center gap-2">
          <Badge 
            variant={config.variant}
            className={cn(
              'flex items-center gap-1.5 font-medium',
              sizeClasses[size],
              hasWarnings && 'border-warning',
              hasFailureScenario && 'border-dashed'
            )}
          >
            <Icon className={cn(
              size === 'sm' && 'w-3 h-3',
              size === 'md' && 'w-4 h-4', 
              size === 'lg' && 'w-5 h-5'
            )} />
            {config.label}
            {hasFailureScenario && (
              <span className="text-xs bg-destructive/20 text-destructive px-1 rounded">
                FAILURE
              </span>
            )}
          </Badge>

          {(hasWarnings || showDetails) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggle}
                  className="h-6 w-6 p-0"
                >
                  {hasWarnings ? (
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  ) : (
                    <Info className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {hasWarnings ? 'View warnings and details' : 'View classification details'}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Expandable Details */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="space-y-3">
            {/* Description */}
            <div className={cn('p-3 rounded-lg border', config.bgColor)}>
              <div className="flex items-start gap-2">
                <Icon className={cn('w-5 h-5 mt-0.5', config.color)} />
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium">{config.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {config.description}
                  </p>
                  
                  {/* Technical Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Opening Ratio:</span>
                      <span className="ml-2 font-mono">{(classification.ratio * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GCpi Range:</span>
                      <span className="ml-2 font-mono">
                        {classification.gcpi_negative.toFixed(2)} to +{classification.gcpi_positive.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {hasWarnings && (
              <div className="space-y-2">
                {classification.warnings.map((warning, index) => (
                  <Alert key={index} variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {warning}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Failure Scenario Alert */}
            {hasFailureScenario && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Glazing Failure Scenario Active:</strong> Analysis includes potential 
                  failure of glazed openings, which may change enclosure classification and 
                  internal pressures during extreme wind events.
                </AlertDescription>
              </Alert>
            )}

            {/* Recommendations */}
            {classification.type === 'partially_enclosed' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      Design Considerations
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-200 leading-relaxed">
                      Consider using higher internal pressure coefficients and verify 
                      structural adequacy for potential pressure differentials across 
                      the building envelope.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </TooltipProvider>
  );
});

export default EnclosureClassificationBadge;