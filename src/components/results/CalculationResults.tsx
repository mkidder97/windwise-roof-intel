import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calculator, Wind, AlertTriangle, CheckCircle, Award } from 'lucide-react';
import type { ProfessionalCalculationResults } from '@/types/wind-calculator';
import type { Zone1PrimeAnalysis } from '@/utils/zone1PrimeDetection';
import type { ZoneCalculationResults } from '@/utils/asceZoneCalculations';

interface CalculationResultsProps {
  results: ProfessionalCalculationResults;
  showDetailedBreakdown?: boolean;
  zone1PrimeAnalysis?: Zone1PrimeAnalysis | null;
  zoneCalculationResults?: ZoneCalculationResults | null;
}

export const CalculationResults: React.FC<CalculationResultsProps> = ({
  results,
  showDetailedBreakdown = true,
  zone1PrimeAnalysis = null,
  zoneCalculationResults = null
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

      {/* Zone Pressures - ASCE 4-Zone System */}
      {showDetailedBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wind className="h-5 w-5 text-primary" />
              ASCE Zone Pressure Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {zoneCalculationResults ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Zone 3 - Field */}
                  {zoneCalculationResults.zones.filter(z => z.type === 'field').map(zone => (
                    <div key={zone.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Zone 3 (Field)</span>
                        {zoneCalculationResults.controllingZone.includes('Field') && (
                          <Badge variant="default">Controlling</Badge>
                        )}
                      </div>
                      <div className="text-2xl font-bold">{formatPressure(zone.netPressure)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        GCp = {zone.gcp.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Area: {zone.area.toFixed(0)} sq ft
                      </div>
                    </div>
                  ))}

                  {/* Zone 2 - Perimeter */}
                  {zoneCalculationResults.zones.filter(z => z.type === 'perimeter').map(zone => (
                    <div key={zone.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Zone 2 (Perimeter)</span>
                        {zoneCalculationResults.controllingZone.includes('Perimeter') && !zoneCalculationResults.controllingZone.includes("Zone 1'") && (
                          <Badge variant="default">Controlling</Badge>
                        )}
                      </div>
                      <div className="text-2xl font-bold">{formatPressure(zone.netPressure)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        GCp = {zone.gcp.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Area: {zone.area.toFixed(0)} sq ft
                      </div>
                    </div>
                  ))}

                  {/* Zone 1 - Corner (Always show) */}
                  {(() => {
                    const standardCornerZone = zoneCalculationResults.zones.find(z => z.type === 'corner');
                    const enhancedCornerZone = zoneCalculationResults.zones.find(z => z.type === 'corner_prime');
                    const displayZone = standardCornerZone || enhancedCornerZone;
                    
                    if (!displayZone) return null;
                    
                    return (
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Zone 1 (Corner)</span>
                          {zoneCalculationResults.controllingZone.includes('Corner') && !zoneCalculationResults.controllingZone.includes("Zone 1'") && (
                            <Badge variant="default">Controlling</Badge>
                          )}
                        </div>
                        <div className="text-2xl font-bold">{formatPressure(displayZone.netPressure)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          GCp = {displayZone.gcp.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          4 corners × {displayZone.area.toFixed(0)} sq ft each
                        </div>
                      </div>
                    );
                  })()}

                  {/* Zone 1' - Enhanced Corner (Only when Zone 1' is required) */}
                  {zoneCalculationResults.zone1PrimeRequired && (() => {
                    const zone1PrimeZone = zoneCalculationResults.zones.find(z => z.type === 'corner_prime');
                    if (!zone1PrimeZone) return null;
                    
                    return (
                      <div className="p-4 border rounded-lg border-orange-200 bg-orange-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Zone 1' (Enhanced)</span>
                          <div className="flex gap-1">
                            {zoneCalculationResults.controllingZone.includes("Zone 1'") && (
                              <Badge variant="default">Controlling</Badge>
                            )}
                            <Badge variant="secondary" className="text-orange-600">Zone 1'</Badge>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-orange-700">{formatPressure(zone1PrimeZone.netPressure)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          GCp = {zone1PrimeZone.gcp.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          4 corners × {zone1PrimeZone.area.toFixed(0)} sq ft each
                        </div>
                        {zone1PrimeAnalysis?.isRequired && (
                          <div className="text-xs text-orange-600 mt-1">
                            +{zone1PrimeAnalysis.pressureIncrease}% increase applied
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Enhanced Perimeter Zone (for highly elongated buildings) */}
                {zoneCalculationResults.zones.filter(z => z.type === 'perimeter_prime').length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-3">Enhanced Perimeter Zones (Zone 1' Extension)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {zoneCalculationResults.zones.filter(z => z.type === 'perimeter_prime').map(zone => (
                        <div key={zone.id} className="p-4 border rounded-lg border-orange-200 bg-orange-50/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{zone.name}</span>
                            <Badge variant="secondary" className="text-orange-600">Zone 1'</Badge>
                          </div>
                          <div className="text-xl font-bold text-orange-700">{formatPressure(zone.netPressure)}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            GCp = {zone.gcp.toFixed(2)} | Area: {zone.area.toFixed(0)} sq ft
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Zone Summary */}
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">ASCE Zone Analysis Summary</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Total zones analyzed: {zoneCalculationResults.zones.length}</div>
                    <div>Total roof area: {zoneCalculationResults.affectedArea.total.toFixed(0)} sq ft</div>
                    {zoneCalculationResults.zone1PrimeRequired && (
                      <div className="text-orange-600">
                        Zone 1' enhanced area: {zoneCalculationResults.affectedArea.zone1Prime.toFixed(0)} sq ft 
                        ({((zoneCalculationResults.affectedArea.zone1Prime / zoneCalculationResults.affectedArea.total) * 100).toFixed(1)}% of roof)
                      </div>
                    )}
                    <div>Reference: ASCE 7-16 Figure 30.11-1, ASCE 7-22 Figure 26.11-1</div>
                  </div>
                </div>
              </>
            ) : (
              /* Fallback to simplified display */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Zone 3 (Field)</span>
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
                    <span className="font-medium">Zone 2 (Perimeter)</span>
                    {results.controllingZone === 'Perimeter' && (
                      <Badge variant="default">Controlling</Badge>
                    )}
                  </div>
                  <div className="text-2xl font-bold">{formatPressure(results.perimeterPressure)}</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Zone 1 (Corner)</span>
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
            )}

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