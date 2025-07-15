import React from 'react';
import { AlertTriangle, Building2, Wind, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Zone1PrimeAnalysis {
  isRequired: boolean;
  aspectRatio: number;
  heightRatio: number;
  pressureIncrease: number;
  confidence: number;
  explanation: string;
  warnings: string[];
}

interface Zone1PrimeIndicatorProps {
  analysis: Zone1PrimeAnalysis | null;
  buildingLength: number;
  buildingWidth: number;
  buildingHeight: number;
  className?: string;
}

export function Zone1PrimeIndicator({
  analysis,
  buildingLength,
  buildingWidth,
  buildingHeight,
  className = ""
}: Zone1PrimeIndicatorProps) {
  
  if (!analysis) {
    return null;
  }

  const getIndicatorColor = () => {
    if (!analysis.isRequired) return 'bg-green-500';
    if (analysis.pressureIncrease >= 30) return 'bg-red-500';
    if (analysis.pressureIncrease >= 20) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  const getIndicatorText = () => {
    if (!analysis.isRequired) return 'STANDARD ZONES';
    return 'ZONE 1\' REQUIRED';
  };

  const getBadgeVariant = () => {
    if (!analysis.isRequired) return 'default';
    if (analysis.pressureIncrease >= 30) return 'destructive';
    return 'secondary';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Zone 1' Alert */}
      <Alert className={`border-l-4 ${analysis.isRequired ? 'border-l-orange-500 bg-orange-50' : 'border-l-green-500 bg-green-50'}`}>
        <div className="flex items-start space-x-3">
          <div className={`w-3 h-3 rounded-full mt-1 ${getIndicatorColor()}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span className="font-semibold text-sm">{getIndicatorText()}</span>
                <Badge variant={getBadgeVariant()}>
                  {analysis.isRequired ? `+${analysis.pressureIncrease}%` : 'Standard'}
                </Badge>
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>Confidence:</span>
                <span className="font-medium">{analysis.confidence}%</span>
              </div>
            </div>
            <AlertDescription className="text-sm">
              {analysis.explanation}
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {/* Detailed Analysis Card */}
      {analysis.isRequired && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Wind className="h-4 w-4 text-orange-600" />
              <span>Zone 1' Analysis Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Building Geometry Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="font-medium text-gray-900">{buildingLength}'</p>
                <p className="text-xs text-gray-600">Length</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="font-medium text-gray-900">{buildingWidth}'</p>
                <p className="text-xs text-gray-600">Width</p>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <p className="font-medium text-orange-900">{analysis.aspectRatio.toFixed(1)}:1</p>
                <p className="text-xs text-orange-600">Aspect Ratio</p>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <p className="font-medium text-orange-900">{analysis.heightRatio.toFixed(1)}:1</p>
                <p className="text-xs text-orange-600">Height Ratio</p>
              </div>
            </div>

            {/* Pressure Increase Visualization */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Enhanced Pressure Level</span>
                <span className="font-bold text-orange-600">+{analysis.pressureIncrease}%</span>
              </div>
              <Progress 
                value={Math.min(analysis.pressureIncrease, 40)} 
                max={40}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Standard (0%)</span>
                <span>Moderate (+20%)</span>
                <span>High (+40%)</span>
              </div>
            </div>

            {/* Key Impacts */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center space-x-1">
                <TrendingUp className="h-3 w-3" />
                <span>Key Impacts</span>
              </h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Corner Zone Pressures:</span>
                  <span className="font-medium text-orange-600">Enhanced</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Fastening Requirements:</span>
                  <span className="font-medium text-orange-600">Increased</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>PE Validation Required:</span>
                  <span className="font-medium text-red-600">Yes</span>
                </div>
              </div>
            </div>

            {/* Professional Warnings */}
            {analysis.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800 text-sm mb-1">Professional Considerations:</p>
                    <ul className="space-y-1">
                      {analysis.warnings.map((warning, index) => (
                        <li key={index} className="text-xs text-yellow-700">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ASCE Reference */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              <p><strong>Reference:</strong> ASCE 7-22 Figure 26.11-1A, Section 26.11.1</p>
              <p><strong>Methodology:</strong> Automated Zone 1' detection per professional standards</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}