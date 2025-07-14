import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PressureDisplayCardProps {
  title: string;
  value: number;
  netValue?: number;
  unit?: string;
  description?: string;
  asceReference?: string;
  zoneType?: 'field' | 'perimeter' | 'corner';
  showNet?: boolean;
  className?: string;
  onExport?: () => void;
  warningThreshold?: number;
  criticalThreshold?: number;
}

const PressureDisplayCard = memo(function PressureDisplayCard({
  title,
  value,
  netValue,
  unit = 'psf',
  description,
  asceReference,
  zoneType = 'field',
  showNet = false,
  className,
  onExport,
  warningThreshold = 50,
  criticalThreshold = 80,
}: PressureDisplayCardProps) {
  const displayValue = showNet && netValue !== undefined ? netValue : value;
  const isNet = showNet && netValue !== undefined;
  
  // Determine pressure level styling
  const getPressureLevel = (pressure: number) => {
    const absPressure = Math.abs(pressure);
    if (absPressure >= criticalThreshold) return 'critical';
    if (absPressure >= warningThreshold) return 'warning';
    return 'normal';
  };

  const pressureLevel = getPressureLevel(displayValue);
  
  // Zone-specific styling
  const getZoneStyles = () => {
    switch (zoneType) {
      case 'corner':
        return 'border-destructive/20 bg-destructive/5';
      case 'perimeter':
        return 'border-warning/20 bg-warning/5';
      case 'field':
      default:
        return 'border-primary/20 bg-primary/5';
    }
  };

  const getPressureLevelStyles = () => {
    switch (pressureLevel) {
      case 'critical':
        return 'text-destructive border-destructive/30 bg-destructive/10';
      case 'warning':
        return 'text-warning border-warning/30 bg-warning/10';
      case 'normal':
      default:
        return 'text-foreground';
    }
  };

  const formatPressure = (pressure: number) => {
    return pressure >= 0 ? `+${pressure.toFixed(1)}` : pressure.toFixed(1);
  };

  const getZoneBadgeColor = () => {
    switch (zoneType) {
      case 'corner':
        return 'destructive';
      case 'perimeter':
        return 'warning';
      case 'field':
      default:
        return 'secondary';
    }
  };

  return (
    <TooltipProvider>
      <Card className={cn(
        'transition-all duration-200 hover:shadow-md',
        getZoneStyles(),
        getPressureLevelStyles(),
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {title}
              <Badge variant={getZoneBadgeColor()} className="text-xs">
                {zoneType}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              {asceReference && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">ASCE Reference: {asceReference}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {onExport && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onExport}
                      className="p-1 hover:bg-accent rounded-sm transition-colors"
                    >
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Export pressure data</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Main pressure value */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {formatPressure(displayValue)}
              </span>
              <span className="text-sm text-muted-foreground">{unit}</span>
              {displayValue > 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>

            {/* Net vs Gross indicator */}
            {showNet && netValue !== undefined && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {isNet ? 'NET' : 'GROSS'}
                </Badge>
                {!isNet && (
                  <span>
                    Net: {formatPressure(netValue)} {unit}
                  </span>
                )}
              </div>
            )}

            {/* Pressure breakdown */}
            {!isNet && netValue !== undefined && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>External Pressure:</span>
                  <span className="tabular-nums">{formatPressure(value)} {unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Internal Pressure:</span>
                  <span className="tabular-nums">{formatPressure(value - netValue)} {unit}</span>
                </div>
                <div className="h-px bg-border my-1" />
                <div className="flex justify-between font-medium text-foreground">
                  <span>Net Pressure:</span>
                  <span className="tabular-nums">{formatPressure(netValue)} {unit}</span>
                </div>
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}

            {/* Pressure level indicator */}
            <div className="flex items-center gap-2 text-xs">
              <div className={cn(
                'h-2 w-2 rounded-full',
                pressureLevel === 'critical' && 'bg-destructive',
                pressureLevel === 'warning' && 'bg-warning', 
                pressureLevel === 'normal' && 'bg-success'
              )} />
              <span className="text-muted-foreground">
                {pressureLevel === 'critical' && 'High pressure - review design'}
                {pressureLevel === 'warning' && 'Moderate pressure - verify'}
                {pressureLevel === 'normal' && 'Normal pressure range'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});

export default PressureDisplayCard;