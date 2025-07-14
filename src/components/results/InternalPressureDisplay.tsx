import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Wind, AlertTriangle, Info, Shield } from 'lucide-react';
import type { EnclosureClassification } from '@/lib/asceCalculations';
import type { ProfessionalCalculationResults } from '@/types/wind-calculator';

interface InternalPressureDisplayProps {
  results: ProfessionalCalculationResults;
  enclosureData?: EnclosureClassification;
}

export const InternalPressureDisplay: React.FC<InternalPressureDisplayProps> = ({
  results,
  enclosureData
}) => {
  const formatPressure = (value: number) => `${value.toFixed(1)} psf`;
  const formatCoefficient = (value: number) => value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);

  const getEnclosureTypeColor = (type: string) => {
    switch (type) {
      case 'enclosed': return 'text-green-600';
      case 'partially_enclosed': return 'text-yellow-600';
      case 'open': return 'text-blue-600';
      default: return 'text-muted-foreground';
    }
  };

  const getEnclosureTypeBadge = (type: string) => {
    switch (type) {
      case 'enclosed': return <Badge variant="default">Enclosed</Badge>;
      case 'partially_enclosed': return <Badge variant="secondary">Partially Enclosed</Badge>;
      case 'open': return <Badge variant="outline">Open</Badge>;
      default: return <Badge variant="destructive">Unknown</Badge>;
    }
  };

  const openingRatioPercentage = enclosureData ? (enclosureData.openingRatio * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Internal Pressure Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            Internal Pressure Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.internalPressureIncluded ? (
            <>
              {/* GCpi Values */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">GCpi (+)</span>
                    <Badge variant="outline">Positive</Badge>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {results.gcpiPositive ? formatCoefficient(results.gcpiPositive) : '+0.18'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Internal pressure coefficient (positive)
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">GCpi (-)</span>
                    <Badge variant="outline">Negative</Badge>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {results.gcpiNegative ? formatCoefficient(results.gcpiNegative) : '-0.18'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Internal pressure coefficient (negative)
                  </div>
                </div>
              </div>

              {/* Enclosure Classification */}
              {enclosureData && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Building Enclosure Classification
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">Classification:</span>
                          {getEnclosureTypeBadge(enclosureData.type)}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Opening Ratio:</span>
                            <span className="font-medium">{(openingRatioPercentage).toFixed(2)}%</span>
                          </div>
                          <Progress value={Math.min(openingRatioPercentage * 10, 100)} className="h-2" />
                          
                          <div className="flex justify-between text-sm">
                            <span>Total Opening Area:</span>
                            <span className="font-medium">{enclosureData.totalOpeningArea.toFixed(1)} sq ft</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Dominant Opening:</span>
                            <span className={enclosureData.hasDominantOpening ? 'text-yellow-600' : 'text-green-600'}>
                              {enclosureData.hasDominantOpening ? 'Yes' : 'No'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>Failure Scenario:</span>
                            <span className={enclosureData.failureScenarioConsidered ? 'text-yellow-600' : 'text-muted-foreground'}>
                              {enclosureData.failureScenarioConsidered ? 'Considered' : 'Not Applied'}
                            </span>
                          </div>
                          
                          {enclosureData.windwardOpeningArea > 0 && (
                            <div className="flex justify-between">
                              <span>Windward Openings:</span>
                              <span className="font-medium">{enclosureData.windwardOpeningArea.toFixed(1)} sq ft</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Enclosure Warnings */}
              {enclosureData?.warnings && enclosureData.warnings.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Enclosure Classification Warnings
                    </h4>
                    <div className="space-y-2">
                      {enclosureData.warnings.map((warning, index) => (
                        <Alert key={index}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-sm">{warning}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Design Recommendations */}
              <Separator />
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  Design Considerations
                </h4>
                
                <div className="space-y-3 text-sm">
                  {enclosureData?.type === 'partially_enclosed' && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Partially enclosed buildings experience higher internal pressures. Consider strengthening 
                        the building envelope or reducing the size of dominant openings.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {enclosureData?.failureScenarioConsidered && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Failure scenario analysis increases internal pressure coefficients to account for 
                        potential opening failures during extreme wind events.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground">
                      <strong>Note:</strong> Internal pressure significantly affects net design pressures. 
                      Accurate enclosure classification is critical for safe and economical design.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Internal pressure effects are not included in this calculation. For complete design pressures, 
                enable internal pressure analysis in the professional calculation mode.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};