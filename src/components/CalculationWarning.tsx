import React, { useState } from 'react';
import { AlertTriangle, Shield, FileText, Eye, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CalculationWarningProps {
  onAcknowledge: (acknowledged: boolean) => void;
  calculationType: 'basic' | 'professional';
  enclosureType?: 'enclosed' | 'partially_enclosed' | 'open';
  confidence?: number;
  showEnclosureWarning?: boolean;
}

export function CalculationWarning({ 
  onAcknowledge, 
  calculationType,
  enclosureType,
  confidence,
  showEnclosureWarning = false
}: CalculationWarningProps) {
  const [betaAcknowledged, setBetaAcknowledged] = useState(false);
  const [liabilityAcknowledged, setLiabilityAcknowledged] = useState(false);
  const [enclosureAcknowledged, setEnclosureAcknowledged] = useState(false);

  const allAcknowledged = betaAcknowledged && liabilityAcknowledged && 
    (!showEnclosureWarning || enclosureAcknowledged);

  React.useEffect(() => {
    onAcknowledge(allAcknowledged);
  }, [allAcknowledged, onAcknowledge]);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'bg-green-500';
    if (conf >= 0.75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.9) return 'High Confidence';
    if (conf >= 0.75) return 'Medium Confidence';
    return 'Low Confidence - Manual Review Required';
  };

  return (
    <div className="space-y-4">
      {/* Beta Version Warning */}
      <Alert className="border-red-500 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="space-y-2">
            <p className="font-bold text-lg">⚠️ BETA VERSION - NOT YET VERIFIED FOR PE SEAL ⚠️</p>
            <p>
              This software is in development and has not been independently verified for professional engineering use. 
              All calculations must be manually verified by a licensed professional engineer before use in construction documents.
            </p>
            <div className="flex items-center space-x-2 mt-3">
              <Checkbox 
                id="beta-acknowledge"
                checked={betaAcknowledged}
                onCheckedChange={(checked) => setBetaAcknowledged(!!checked)}
              />
              <label htmlFor="beta-acknowledge" className="text-sm font-medium">
                I acknowledge this is beta software requiring professional verification
              </label>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Professional Liability Warning */}
      <Alert className="border-orange-500 bg-orange-50">
        <Shield className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="space-y-2">
            <p className="font-semibold">Professional Liability Notice</p>
            <p>
              Wind load calculations affect structural safety. Users are responsible for:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Verifying all inputs and assumptions</li>
              <li>Ensuring compliance with local building codes</li>
              <li>Having calculations reviewed by a licensed PE</li>
              <li>Understanding calculation limitations and scope</li>
            </ul>
            <div className="flex items-center space-x-2 mt-3">
              <Checkbox 
                id="liability-acknowledge"
                checked={liabilityAcknowledged}
                onCheckedChange={(checked) => setLiabilityAcknowledged(!!checked)}
              />
              <label htmlFor="liability-acknowledge" className="text-sm font-medium">
                I understand my professional responsibilities for these calculations
              </label>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Partially Enclosed Building Warning */}
      {showEnclosureWarning && enclosureType === 'partially_enclosed' && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <p className="font-semibold text-red-900">⚠️ PARTIALLY ENCLOSED BUILDING DETECTED ⚠️</p>
              <p>
                This building classification results in significantly higher internal pressures. 
                Consider failure scenarios where glazed openings may break, converting an enclosed building to partially enclosed.
              </p>
              <div className="bg-red-100 p-3 rounded-md mt-2">
                <p className="font-medium">Critical Design Considerations:</p>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>Internal pressure coefficients (GCpi) = ±0.55</li>
                  <li>Net pressures may be 2-3x higher than enclosed buildings</li>
                  <li>Consider progressive failure scenarios</li>
                  <li>Review glazing impact resistance requirements</li>
                </ul>
              </div>
              <div className="flex items-center space-x-2 mt-3">
                <Checkbox 
                  id="enclosure-acknowledge"
                  checked={enclosureAcknowledged}
                  onCheckedChange={(checked) => setEnclosureAcknowledged(!!checked)}
                />
                <label htmlFor="enclosure-acknowledge" className="text-sm font-medium">
                  I understand the implications of partially enclosed building classification
                </label>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Calculation Confidence Indicator */}
      {confidence !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Calculation Confidence</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{getConfidenceLabel(confidence)}</span>
                  <span className="text-sm">{(confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getConfidenceColor(confidence)}`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
              </div>
              <Badge variant={confidence >= 0.9 ? "default" : confidence >= 0.75 ? "secondary" : "destructive"}>
                {confidence >= 0.9 ? "Ready" : confidence >= 0.75 ? "Review" : "Verify"}
              </Badge>
            </div>
            
            {confidence < 0.9 && (
              <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Manual verification recommended:</strong> Unusual parameters or edge cases detected. 
                  Review inputs and consider alternative calculation methods.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ASCE References */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>ASCE 7-22 References</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Chapter 26:</strong> Wind Loads on Buildings - MWFRS</p>
            <p><strong>Section 26.8:</strong> Velocity Pressure</p>
            <p><strong>Section 26.9:</strong> Gust-Effect Factor</p>
            <p><strong>Section 26.11:</strong> Design Wind Pressures</p>
            <p><strong>Table 26.10-1:</strong> Velocity Pressure Exposure Coefficients (Kz)</p>
            {calculationType === 'professional' && (
              <>
                <p><strong>Section 26.12:</strong> Enclosure Classification</p>
                <p><strong>Table 26.13-1:</strong> Internal Pressure Coefficients (GCpi)</p>
                <p><strong>Table 30.3-1:</strong> External Pressure Coefficients (GCp)</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Verification Reminder */}
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Remember to manually verify:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Local building code requirements and modifications</li>
              <li>Site-specific exposure conditions</li>
              <li>Building geometry and structural system compatibility</li>
              <li>Load combinations and factored design loads</li>
              <li>Special considerations for building importance factor</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}