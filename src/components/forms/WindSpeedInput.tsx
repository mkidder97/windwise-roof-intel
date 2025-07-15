import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Wind, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { useWindSpeedLookup } from '@/hooks/useWindSpeedLookup';
import { EngineerVerificationCheckbox } from '@/components/EngineerVerificationCheckbox';
import type { WindSpeedData, LocationData, EngineerVerification } from '@/types/wind-calculator';

interface WindSpeedInputProps {
  value: WindSpeedData;
  location: LocationData;
  asceEdition: string;
  onChange: (data: WindSpeedData) => void;
  onValidationChange: (isValid: boolean) => void;
  verification?: EngineerVerification;
  onVerificationChange?: (verification: EngineerVerification) => void;
  isLoading?: boolean;
}

export const WindSpeedInput: React.FC<WindSpeedInputProps> = ({
  value,
  location,
  asceEdition,
  onChange,
  onValidationChange,
  verification,
  onVerificationChange,
  isLoading: externalIsLoading
}) => {
  const [useCustomSpeed, setUseCustomSpeed] = useState(value.source === 'custom');
  const [justification, setJustification] = useState(value.justification || '');
  const { lookupWindSpeed, isLoading: internalIsLoading, validation } = useWindSpeedLookup();
  
  const isLoading = externalIsLoading || internalIsLoading;

  useEffect(() => {
    onValidationChange(validation.isValid);
  }, [validation.isValid, onValidationChange]);

  const handleLookup = async () => {
    if (!location.city || !location.state) {
      return;
    }

    const result = await lookupWindSpeed(location.city, location.state, asceEdition);
    onChange(result);
    setUseCustomSpeed(false);
  };

  const handleCustomSpeedChange = (customValue: number) => {
    const customData: WindSpeedData = {
      value: customValue,
      source: 'custom',
      confidence: 100,
      justification,
      city: location.city,
      state: location.state,
      asceEdition
    };
    onChange(customData);
  };

  const handleJustificationChange = (newJustification: string) => {
    setJustification(newJustification);
    if (value.source === 'custom') {
      onChange({
        ...value,
        justification: newJustification
      });
    }
  };

  const getSourceBadgeVariant = () => {
    switch (value.source) {
      case 'database': return 'default';
      case 'interpolated': return 'secondary';
      case 'custom': return 'outline';
      default: return 'destructive';
    }
  };

  const getSourceDescription = () => {
    switch (value.source) {
      case 'database': return 'Exact match from ASCE database';
      case 'interpolated': return 'Interpolated from nearby cities';
      case 'custom': return 'Custom value with engineering justification';
      case 'manual': return 'Manual entry - requires verification';
      default: return 'Unknown source';
    }
  };

  // Show verification when wind speed is determined and it's from database or interpolated
  const showVerification = value.value > 0 && 
    (value.source === 'database' || value.source === 'interpolated') && 
    verification && 
    onVerificationChange;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            Wind Speed Determination
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Database Lookup Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Wind Speed (mph)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLookup}
                disabled={isLoading || !location.city || !location.state}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {isLoading ? 'Looking up...' : 'Lookup'}
              </Button>
            </div>

            {!useCustomSpeed && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={value.value}
                    disabled
                    className="bg-muted"
                  />
                  <Badge variant={getSourceBadgeVariant()}>
                    {value.source}
                  </Badge>
                  {validation.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {getSourceDescription()}
                </p>
                {validation.confidence > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Confidence: {validation.confidence}%
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Custom Wind Speed Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="custom-wind-speed"
                checked={useCustomSpeed}
                onCheckedChange={setUseCustomSpeed}
              />
              <Label htmlFor="custom-wind-speed">Use custom wind speed</Label>
            </div>

            {useCustomSpeed && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="custom-speed-value">Custom Wind Speed (mph)</Label>
                  <Input
                    id="custom-speed-value"
                    type="number"
                    value={value.source === 'custom' ? value.value : ''}
                    onChange={(e) => handleCustomSpeedChange(Number(e.target.value))}
                    placeholder="Enter custom wind speed"
                    min="50"
                    max="250"
                  />
                </div>

                <div>
                  <Label htmlFor="justification">Engineering Justification (Required)</Label>
                  <Textarea
                    id="justification"
                    value={justification}
                    onChange={(e) => handleJustificationChange(e.target.value)}
                    placeholder="Provide engineering justification for custom wind speed (site-specific studies, local amendments, etc.)"
                    rows={3}
                  />
                </div>

                {value.source === 'custom' && !justification && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Engineering justification is required for custom wind speeds.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Validation Warnings */}
          {validation.source === 'interpolated' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Wind speed interpolated from nearby cities. Verify with local code official.
              </AlertDescription>
            </Alert>
          )}

          {validation.source === 'default' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Using default wind speed. Verify with ASCE 7 wind speed maps.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Engineer Verification Component */}
      {showVerification && (
        <EngineerVerificationCheckbox
          windSpeedData={value}
          location={location}
          asceEdition={asceEdition}
          verification={verification}
          onChange={onVerificationChange}
        />
      )}
    </div>
  );
};