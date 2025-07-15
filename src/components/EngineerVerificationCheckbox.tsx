import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import type { WindSpeedData, LocationData, EngineerVerification } from '@/types/wind-calculator';

interface EngineerVerificationCheckboxProps {
  windSpeedData: WindSpeedData;
  location: LocationData;
  asceEdition: string;
  verification: EngineerVerification;
  onChange: (verification: EngineerVerification) => void;
}

export const EngineerVerificationCheckbox: React.FC<EngineerVerificationCheckboxProps> = ({
  windSpeedData,
  location,
  asceEdition,
  verification,
  onChange
}) => {
  const [showEngineerFields, setShowEngineerFields] = useState(false);

  const handleVerificationChange = (isVerified: boolean) => {
    onChange({
      ...verification,
      isVerified,
      verificationDate: isVerified ? new Date().toISOString() : undefined
    });
  };

  const handleEngineerInfoChange = (field: keyof EngineerVerification, value: string) => {
    onChange({
      ...verification,
      [field]: value
    });
  };

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Shield className="h-5 w-5" />
          Engineer Verification Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wind Speed Summary */}
        <div className="bg-white dark:bg-gray-800 p-3 rounded-md border">
          <h4 className="font-semibold text-sm mb-2">Wind Speed Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Location:</span>
              <span className="ml-2 font-medium">{location.city}, {location.state}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Wind Speed:</span>
              <span className="ml-2 font-medium">{windSpeedData.value} mph</span>
            </div>
            <div>
              <span className="text-muted-foreground">Source:</span>
              <span className="ml-2 font-medium capitalize">{windSpeedData.source}</span>
            </div>
            <div>
              <span className="text-muted-foreground">ASCE Edition:</span>
              <span className="ml-2 font-medium">{asceEdition}</span>
            </div>
          </div>
        </div>

        {/* Professional Disclaimer */}
        <Alert className="border-amber-300 bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Professional Engineering Responsibility:</strong> By checking this box, the licensed professional engineer 
            acknowledges responsibility for verifying that the wind speed and ASCE requirements are appropriate for this specific 
            project location and application. This verification is required for all professional calculations.
          </AlertDescription>
        </Alert>

        {/* Engineer Verification Checkbox */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="engineer-verification"
            checked={verification.isVerified}
            onCheckedChange={handleVerificationChange}
            className="mt-1"
          />
          <div className="space-y-1">
            <Label htmlFor="engineer-verification" className="text-sm font-medium cursor-pointer">
              I verify these ASCE wind requirements are correct for this project
            </Label>
            <p className="text-xs text-muted-foreground">
              Required for professional wind load calculations
            </p>
          </div>
        </div>

        {/* Optional Engineer Information */}
        {verification.isVerified && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Engineer Information (Optional)</Label>
              <button
                type="button"
                onClick={() => setShowEngineerFields(!showEngineerFields)}
                className="text-xs text-primary hover:underline"
              >
                {showEngineerFields ? 'Hide' : 'Add Engineer Details'}
              </button>
            </div>

            {showEngineerFields && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="engineer-name" className="text-xs">Engineer Name</Label>
                  <Input
                    id="engineer-name"
                    value={verification.engineerName || ''}
                    onChange={(e) => handleEngineerInfoChange('engineerName', e.target.value)}
                    placeholder="John Doe, P.E."
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="engineer-license" className="text-xs">PE License Number</Label>
                  <Input
                    id="engineer-license"
                    value={verification.engineerLicense || ''}
                    onChange={(e) => handleEngineerInfoChange('engineerLicense', e.target.value)}
                    placeholder="PE-12345"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="engineer-state" className="text-xs">Licensed State</Label>
                  <Input
                    id="engineer-state"
                    value={verification.engineerState || ''}
                    onChange={(e) => handleEngineerInfoChange('engineerState', e.target.value)}
                    placeholder="TX"
                    maxLength={2}
                    className="text-sm uppercase"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warning if not verified */}
        {!verification.isVerified && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Engineer verification is required before wind load calculations can proceed.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};