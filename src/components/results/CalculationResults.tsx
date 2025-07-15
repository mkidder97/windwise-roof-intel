import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calculator, Wind, AlertTriangle, CheckCircle, Award } from 'lucide-react';
import type { ProfessionalCalculationResults } from '@/types/wind-calculator';
import type { Zone1PrimeAnalysis } from '@/utils/zone1PrimeDetection';

interface CalculationResultsProps {
  results: ProfessionalCalculationResults;
  showDetailedBreakdown?: boolean;
  zone1PrimeAnalysis?: Zone1PrimeAnalysis | null;
}

export const CalculationResults: React.FC<CalculationResultsProps> = ({
  results,
  showDetailedBreakdown = true,
  zone1PrimeAnalysis = null
}) => {
  const formatPressure = (value: number) => `${value.toFixed(1)} psf`;
  
  const getAccuracyBadge = () => {
    if (results.professionalAccuracy) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Award className="h-3 w-3" />
          PE-Grade Accuracy
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Calculator className="h-3 w-3" />
        Basic Calculation
      </Badge>
    );
  };

  const getConfidenceBadge = () => {
    const confidence = results.uncertaintyBounds.confidence;
    if (confidence >= 90) {
      return <Badge variant="default">High Confidence ({confidence}%)</Badge>;
    } else if (confidence >= 70) {
      return <Badge variant="secondary">Medium Confidence ({confidence}%)</Badge>;
    }
    return <Badge variant="outline">Low Confidence ({confidence}%)</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Wind Pressure Results
            </div>
            <div className="flex items-center gap-2">
              {getAccuracyBadge()}
              {getConfidenceBadge()}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Maximum Pressure - Primary Result */}
          <div className="text-center p-6 bg-muted/50 rounded-lg border-2 border-primary/20">
            <div className="text-sm text-muted-foreground mb-1">Maximum Design Pressure</div>
            <div className="text-4xl font-bold text-primary">{formatPressure(results.maxPressure)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Controlling Zone: {results.controllingZone}
            </div>
          </div>

          {/* Wind Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Wind Speed</div>
              <div className="text-2xl font-semibold">{results.windSpeed} mph</div>
              <Badge variant="outline" className="text-xs">
                {results.windSpeedSource}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Velocity Pressure</div>
              <div className="text-2xl font-semibold">{formatPressure(results.velocityPressure)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Kz Factor</div>
              <div className="text-2xl font-semibold">{results.kzContinuous.toFixed(3)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone Pressures */}
      {showDetailedBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wind className="h-5 w-5 text-primary" />
              Zone Pressure Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Field</span>
                  {results.controllingZone === 'Field' && (
                    <Badge variant="default">Controlling</Badge>
                  )}
                </div>
                <div className="text-2xl font-bold">{formatPressure(results.fieldPressure)}</div>
                {results.fieldPrimePressure && (
                  <div className="text-sm text-muted-foreground">
                    Field Prime: {formatPressure(results.fieldPrimePressure)}
                  </div>
                )}
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Perimeter</span>
                  {results.controllingZone === 'Perimeter' && (
                    <Badge variant="default">Controlling</Badge>
                  )}
                </div>
                <div className="text-2xl font-bold">{formatPressure(results.perimeterPressure)}</div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Corner</span>
                  {(results.controllingZone === 'Corner' || results.controllingZone === "Corner (Zone 1')") && (
                    <Badge variant="default">Controlling</Badge>
                  )}
                  {zone1PrimeAnalysis?.isRequired && (
                    <Badge variant="secondary" className="text-orange-600">Zone 1' Enhanced</Badge>
                  )}
                </div>
                <div className="text-2xl font-bold">{formatPressure(results.cornerPressure)}</div>
                {zone1PrimeAnalysis?.isRequired && (
                  <div className="text-sm text-orange-600 mt-1">
                    +{zone1PrimeAnalysis.pressureIncrease}% increase applied
                  </div>
                )}
              </div>
            </div>

            {/* Net Pressures */}
            {results.internalPressureIncluded && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Net Pressures (Including Internal Pressure)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {results.netPressureField && (
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Net Field</div>
                        <div className="text-lg font-semibold">{formatPressure(results.netPressureField)}</div>
                      </div>
                    )}
                    {results.netPressurePerimeter && (
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Net Perimeter</div>
                        <div className="text-lg font-semibold">{formatPressure(results.netPressurePerimeter)}</div>
                      </div>
                    )}
                    {results.netPressureCorner && (
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Net Corner</div>
                        <div className="text-lg font-semibold">{formatPressure(results.netPressureCorner)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Uncertainty and Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Calculation Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Uncertainty Bounds */}
          <div>
            <h4 className="font-medium mb-2">Uncertainty Bounds</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-muted-foreground">Lower Bound</div>
                <div className="font-semibold">{formatPressure(results.uncertaintyBounds.lower)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Design Value</div>
                <div className="font-semibold text-primary">{formatPressure(results.maxPressure)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Upper Bound</div>
                <div className="font-semibold">{formatPressure(results.uncertaintyBounds.upper)}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Analysis Flags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {results.simplifiedMethodApplicable ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-sm">
                {results.simplifiedMethodApplicable ? 'Simplified Method Applicable' : 'Requires Detailed Analysis'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {results.peReady ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-sm">
                {results.peReady ? 'PE Seal Ready' : 'Requires Professional Review'}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {results.warnings.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Warnings & Considerations
                </h4>
                <div className="space-y-2">
                  {results.warnings.map((warning, index) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">{warning}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation Methodology</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Method Used</h4>
            <p className="text-sm text-muted-foreground">
              {results.methodologyUsed} 
              {zone1PrimeAnalysis?.isRequired && (
                <span className="text-orange-600 font-medium"> with Zone 1' Enhanced Pressures</span>
              )}
            </p>
          </div>

          {results.assumptions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Key Assumptions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {results.assumptions.map((assumption, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></span>
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.asceReferences.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">ASCE 7 References</h4>
              <div className="flex flex-wrap gap-2">
                {results.asceReferences.map((reference, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {reference}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};