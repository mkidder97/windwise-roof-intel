import React, { memo, useCallback, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Enhanced imports with performance optimizations
import { useWindCalculations } from '@/hooks/useWindCalculations';
import { useCalculationStateMachine } from '@/hooks/useCalculationStateMachine';
import { useValidation } from '@/hooks/useValidation';
import { useWindSpeedLookup } from '@/hooks/useWindSpeedLookup';
import { useASCEParameterLookup } from '@/hooks/useASCEParameterLookup';
import { useProjectManager } from '@/hooks/useProjectManager';
import { windCalculatorPersistence } from '@/utils/formPersistence';

// Zone 1' Engine imports
import { analyzeZone1PrimeRequirements } from '@/utils/zone1PrimeDetection';
import { calculateBuildingPressureZones } from '@/utils/asceZoneCalculations';
import { Zone1PrimeIndicator } from '@/components/Zone1PrimeIndicator';
import { EnhancedZoneVisualization } from '@/components/EnhancedZoneVisualization';

// Lazy loaded components for better performance
import { BuildingParametersForm } from '@/components/forms/BuildingParametersForm';
import { WindSpeedInput } from '@/components/forms/WindSpeedInput';
import { ProfessionalParametersForm } from '@/components/forms/ProfessionalParametersForm';
import { EnclosureInput } from '@/components/EnclosureInput';
import { CalculationResults } from '@/components/results/CalculationResults';
import ReportGenerator from '@/components/ReportGenerator';

// New optimized components
import CalculationProgressBar from '@/components/wind-calculator/shared/CalculationProgressBar';
import PressureDisplayCard from '@/components/wind-calculator/shared/PressureDisplayCard';
import EnclosureClassificationBadge from '@/components/wind-calculator/shared/EnclosureClassificationBadge';
import FailureScenarioToggle from '@/components/wind-calculator/shared/FailureScenarioToggle';

// Error boundaries
import CalculationErrorBoundary from '@/components/boundaries/CalculationErrorBoundary';
import FormErrorBoundary from '@/components/boundaries/FormErrorBoundary';

import type { 
  ProfessionalCalculationForm, 
  WindSpeedData, 
  BuildingOpening,
  EngineerVerification
} from '@/types/wind-calculator';
import type { EnclosureClassification } from '@/types/stateMachine.types';
import type { Zone1PrimeAnalysis } from '@/utils/zone1PrimeDetection';
import type { PressureZone, ZoneCalculationResults } from '@/utils/asceZoneCalculations';

// Memoized sub-components for performance
const MemoizedBuildingForm = memo(BuildingParametersForm);
const MemoizedWindSpeedInput = memo(WindSpeedInput);
const MemoizedProfessionalForm = memo(ProfessionalParametersForm);
const MemoizedEnclosureInput = memo(EnclosureInput);
const MemoizedCalculationResults = memo(CalculationResults);

const WindCalculatorOptimized = memo(function WindCalculatorOptimized() {
  // Form management with auto-save
  const form = useForm<ProfessionalCalculationForm>({
    defaultValues: {
      projectName: 'Wind Load Calculation',
      buildingHeight: 20,
      buildingLength: 100,
      buildingWidth: 50,
      city: '',
      state: '',
      exposureCategory: 'C' as const,
      roofType: 'Flat',
      deckType: 'Steel',
      asceEdition: 'ASCE 7-16',
      topographicFactor: 1.0,
      directionalityFactor: 0.85,
      calculationMethod: 'component_cladding' as const,
      buildingClassification: 'enclosed' as const,
      riskCategory: 'II' as const,
      includeInternalPressure: true,
      professionalMode: false,
    },
  });

  // Enhanced hooks with performance optimization
  const { calculateWindPressure, isCalculating, results } = useWindCalculations();
  const { lookupWindSpeed, isLoading: isLookingUp } = useWindSpeedLookup();
  const { lookupASCEParameters, isLoading: isLookingUpASCE } = useASCEParameterLookup();
  const { saveCalculation, isSaving } = useProjectManager();
  const { validationState, validateForm, debouncedValidate } = useValidation({
    enableRealTimeValidation: true,
    debounceMs: 500,
  });

  // State machine for calculation workflow
  const {
    state: calculationState,
    startCalculation,
    reset: resetCalculation,
    updateProgress,
  } = useCalculationStateMachine({
    initialFormData: form.getValues(),
    onStateChange: (state, context) => {
      console.log('Calculation state changed:', state.type);
      if (state.type === 'complete') {
        console.log('📊 Calculation completed');
      }
    },
  });

  // State management
  const [activeTab, setActiveTab] = React.useState('basic');
  const [windSpeedData, setWindSpeedData] = React.useState<WindSpeedData | null>(null);
  const [buildingOpenings, setBuildingOpenings] = React.useState<BuildingOpening[]>([]);
  const [enclosureClassification, setEnclosureClassification] = React.useState<EnclosureClassification | null>(null);
  const [failureScenarioEnabled, setFailureScenarioEnabled] = React.useState(false);
  const [engineerVerification, setEngineerVerification] = React.useState<EngineerVerification>({
    isVerified: false
  });

  // Zone 1' Engine state
  const [zone1PrimeAnalysis, setZone1PrimeAnalysis] = React.useState<Zone1PrimeAnalysis | null>(null);
  const [pressureZones, setPressureZones] = React.useState<PressureZone[]>([]);
  const [zoneCalculationResults, setZoneCalculationResults] = React.useState<ZoneCalculationResults | null>(null);

  // Auto-save form data
  React.useEffect(() => {
    const subscription = form.watch((formData) => {
      windCalculatorPersistence.save(formData as ProfessionalCalculationForm);
      debouncedValidate(formData as ProfessionalCalculationForm);
    });
    return () => subscription.unsubscribe();
  }, [form, debouncedValidate]);

  // Load persisted data on mount
  React.useEffect(() => {
    const savedData = windCalculatorPersistence.load();
    if (savedData) {
      form.reset(savedData);
    }
  }, [form]);

  // Auto-lookup wind speed when city/state changes
  React.useEffect(() => {
    const { city, state, asceEdition } = form.getValues();
    if (city && state && asceEdition && !windSpeedData) {
      console.log('🚀 Auto-triggering wind speed lookup for:', { city, state, asceEdition });
      handleWindSpeedLookup();
    }
  }, [form.watch('city'), form.watch('state'), form.watch('asceEdition'), windSpeedData]);

  // Auto-lookup ASCE parameters when relevant fields change
  React.useEffect(() => {
    const { exposureCategory, asceEdition, buildingHeight, roofType } = form.getValues();
    if (exposureCategory && asceEdition && buildingHeight && roofType) {
      console.log('🚀 Auto-triggering ASCE parameter lookup');
      handleASCEParameterLookup();
    }
  }, [
    form.watch('exposureCategory'), 
    form.watch('asceEdition'), 
    form.watch('buildingHeight'), 
    form.watch('roofType')
  ]);

  // Zone 1' Analysis when building dimensions change
  React.useEffect(() => {
    const { buildingLength, buildingWidth, buildingHeight, exposureCategory } = form.getValues();
    if (buildingLength && buildingWidth && buildingHeight && exposureCategory) {
      console.log('🚀 Auto-triggering Zone 1\' analysis');
      const analysis = analyzeZone1PrimeRequirements(
        buildingLength, buildingWidth, buildingHeight, exposureCategory
      );
      setZone1PrimeAnalysis(analysis);
      console.log('✅ Zone 1\' analysis completed:', analysis);
    }
  }, [
    form.watch('buildingLength'),
    form.watch('buildingWidth'), 
    form.watch('buildingHeight'),
    form.watch('exposureCategory')
  ]);

  // Enhanced calculation handler with Zone 1' integration
  const handleCalculation = useCallback(async () => {
    const formData = form.getValues();
    
    // Validate before calculating
    const validation = await validateForm(formData);
    if (!validation.isValid) {
      return;
    }

    try {
      // Calculate wind pressures with correct ASCE edition
      const calculationResult = await calculateWindPressure(formData, windSpeedData);
      setEnclosureClassification(null); // Reset on successful calculation

      // Integrate Zone 1' analysis into main results
      if (calculationResult && zone1PrimeAnalysis?.isRequired) {
        // Apply Zone 1' pressure increases to the calculation results
        const zone1PrimeMultiplier = 1 + (zone1PrimeAnalysis.pressureIncrease / 100);
        
        // Update corner pressure if Zone 1' applies
        calculationResult.cornerPressure = calculationResult.cornerPressure * zone1PrimeMultiplier;
        
        // Update controlling zone and max pressure
        const updatedMaxPressure = Math.max(
          calculationResult.fieldPressure || 0,
          calculationResult.perimeterPressure || 0, 
          calculationResult.cornerPressure
        );
        
        if (calculationResult.cornerPressure === updatedMaxPressure) {
          calculationResult.controllingZone = "Corner (Zone 1')";
        }
        
        calculationResult.maxPressure = updatedMaxPressure;
        
        // Add Zone 1' information to warnings
        calculationResult.warnings = calculationResult.warnings || [];
        calculationResult.warnings.push(
          `Zone 1' enhanced pressures applied: ${zone1PrimeAnalysis.pressureIncrease}% increase for elongated building geometry`
        );
      }
    } catch (error) {
      console.error('Calculation failed:', error);
    }
  }, [form, windSpeedData, validateForm, calculateWindPressure, zone1PrimeAnalysis]);

  // Optimized wind speed lookup
  const handleWindSpeedLookup = useCallback(async () => {
    const { city, state, asceEdition } = form.getValues();
    if (!city || !state || !asceEdition) return;

    try {
      console.log('🔍 Looking up wind speed for:', { city, state, asceEdition });
      const data = await lookupWindSpeed(city, state, asceEdition);
      setWindSpeedData(data);
      form.setValue('customWindSpeed', data.value);
      console.log('✅ Wind speed lookup completed:', data);
    } catch (error) {
      console.error('❌ Wind speed lookup failed:', error);
    }
  }, [form, lookupWindSpeed]);

  // ASCE parameter lookup
  const handleASCEParameterLookup = useCallback(async () => {
    const { exposureCategory, asceEdition, buildingHeight, roofType } = form.getValues();
    if (!exposureCategory || !asceEdition || !buildingHeight || !roofType) return;

      try {
        console.log('🔍 Looking up ASCE parameters for edition:', asceEdition);
        const data = await lookupASCEParameters(exposureCategory, asceEdition, buildingHeight, roofType);
        
        // Update form with auto-calculated values
        form.setValue('topographicFactor', data.topographicFactor);
        form.setValue('directionalityFactor', data.directionalityFactor);
        
        // Ensure the ASCE edition in calculation method matches selected edition
        console.log('📋 Using ASCE edition:', asceEdition);
        
        console.log('✅ ASCE parameter lookup completed:', data);
      } catch (error) {
        console.error('❌ ASCE parameter lookup failed:', error);
      }
  }, [form, lookupASCEParameters]);

  // Save calculation with engineer verification
  const handleSave = useCallback(async () => {
    if (!results) return;
    const formData = form.getValues();
    await saveCalculation(formData, results, engineerVerification);
  }, [form, results, engineerVerification, saveCalculation]);

  // Memoized component props to prevent unnecessary re-renders
  const buildingFormProps = useMemo(() => ({
    form,
    onFieldChange: (field: string, value: any) => {
      form.setValue(field as keyof ProfessionalCalculationForm, value);
    },
  }), [form]);

  const enclosureInputProps = useMemo(() => ({
    buildingLength: form.watch('buildingLength'),
    buildingWidth: form.watch('buildingWidth'),
    buildingHeight: form.watch('buildingHeight'),
    onOpeningsChange: setBuildingOpenings,
    onEnclosureClassChange: setEnclosureClassification,
    considerFailures: failureScenarioEnabled,
    onConsiderFailuresChange: setFailureScenarioEnabled,
  }), [
    form.watch('buildingLength'),
    form.watch('buildingWidth'), 
    form.watch('buildingHeight'),
    failureScenarioEnabled
  ]);

  return (
    <CalculationErrorBoundary>
      <FormErrorBoundary preserveFormData>
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
          <div className="container mx-auto px-4 py-8">
            <FormProvider {...form}>
              {/* Header with state machine status */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">Wind Load Calculator</h1>
                    <p className="text-muted-foreground">
                      Professional ASCE 7 wind pressure analysis
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-xs">
                      Version: 2.0 Optimized
                    </Badge>
                    
                    {enclosureClassification && (
                      <EnclosureClassificationBadge 
                        classification={enclosureClassification}
                        size="sm"
                      />
                    )}
                  </div>
                </div>

                {/* Progress bar for calculation state */}
                <CalculationProgressBar
                  state={calculationState}
                  onCancel={resetCalculation}
                  onReset={resetCalculation}
                  showTimeEstimate
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Panel */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Calculation Parameters</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="basic">Basic</TabsTrigger>
                          <TabsTrigger value="professional">Professional</TabsTrigger>
                          <TabsTrigger value="enclosure">Enclosure</TabsTrigger>
                          <TabsTrigger value="reports">Reports</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4">
                          <BuildingParametersForm />
                          <WindSpeedInput
                            value={windSpeedData || { 
                              value: form.watch('customWindSpeed') || 0, 
                              source: 'manual', 
                              confidence: 0 
                            }}
                            location={{ city: form.watch('city'), state: form.watch('state') }}
                            asceEdition={form.watch('asceEdition')}
                            onChange={setWindSpeedData}
                            onValidationChange={() => {}}
                            verification={engineerVerification}
                            onVerificationChange={setEngineerVerification}
                            isLoading={isLookingUp}
                          />
                        </TabsContent>

                        <TabsContent value="professional" className="space-y-4">
                          <ProfessionalParametersForm />
                        </TabsContent>

                        <TabsContent value="enclosure" className="space-y-4">
                          <MemoizedEnclosureInput {...enclosureInputProps} />
                          
                          <FailureScenarioToggle
                            enabled={failureScenarioEnabled}
                            onChange={setFailureScenarioEnabled}
                            impactDescription="Analysis will consider potential glazing failures during extreme wind events."
                          />
                        </TabsContent>

                        <TabsContent value="reports" className="space-y-4">
                          {results && <ReportGenerator />}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  {/* Action buttons */}
                  <div className="flex gap-4">
                    <Button
                      onClick={handleCalculation}
                      disabled={
                        isCalculating || 
                        isLookingUp ||
                        isLookingUpASCE ||
                        validationState.errors.length > 0 || 
                        (!windSpeedData || windSpeedData.source === 'manual') ? false : !engineerVerification.isVerified
                      }
                      className="flex-1"
                    >
                      {isCalculating 
                        ? 'Calculating...' 
                        : isLookingUp || isLookingUpASCE
                          ? 'Loading Parameters...'
                          : (!windSpeedData || windSpeedData.source === 'manual')
                            ? 'Calculate Wind Pressures'
                            : !engineerVerification.isVerified
                              ? 'Engineer Verification Required'
                              : 'Calculate Wind Pressures'
                      }
                    </Button>
                    
                    {results && (
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        variant="outline"
                        className="min-w-[120px]"
                      >
                        {isSaving ? 'Saving...' : 'Save Results'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Results Panel */}
                <div className="space-y-6">
                  {results && (
                    <CalculationErrorBoundary>
                      <MemoizedCalculationResults 
                        results={results}
                        showDetailedBreakdown={true}
                        zone1PrimeAnalysis={zone1PrimeAnalysis}
                      />
                    </CalculationErrorBoundary>
                  )}

                  {/* Validation feedback */}
                  {validationState.errors.length > 0 && (
                    <Card className="border-destructive">
                      <CardHeader>
                        <CardTitle className="text-destructive">Validation Errors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1 text-sm">
                          {validationState.errors.map((error, index) => (
                            <li key={index} className="text-destructive">• {error}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Development metrics */}
                  {process.env.NODE_ENV === 'development' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Debug Info</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-2">
                        <div>State: {calculationState.type}</div>
                        <div>Form Valid: {!validationState.errors.length}</div>
                        <div>Enclosure: {enclosureClassification?.type || 'None'}</div>
                        <div>Zone 1': {zone1PrimeAnalysis?.isRequired ? 'Required' : 'Not Required'}</div>
                        <div>ASCE Edition: {form.watch('asceEdition')}</div>
                        <div>Zones: {pressureZones.length}</div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </FormProvider>
          </div>
        </div>
      </FormErrorBoundary>
    </CalculationErrorBoundary>
  );
});

export default WindCalculatorOptimized;