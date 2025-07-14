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
import { windCalculatorPersistence } from '@/utils/formPersistence';

// Lazy loaded components for better performance
import BuildingParametersForm from '@/components/forms/BuildingParametersForm';
import WindSpeedInput from '@/components/forms/WindSpeedInput';
import ProfessionalParametersForm from '@/components/forms/ProfessionalParametersForm';
import EnclosureInput from '@/components/EnclosureInput';
import CalculationResults from '@/components/results/CalculationResults';
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
  BuildingOpening 
} from '@/types/wind-calculator';
import type { EnclosureClassification } from '@/types/stateMachine.types';

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
      asceEdition: 'ASCE 7-22',
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
  const { calculateWindPressure, isCalculating, results, performanceMetrics } = useWindCalculations();
  const { lookupWindSpeed, isLoading: isLookingUp } = useWindSpeedLookup();
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
        console.log('📊 Performance metrics:', performanceMetrics);
      }
    },
  });

  // State management
  const [activeTab, setActiveTab] = React.useState('basic');
  const [windSpeedData, setWindSpeedData] = React.useState<WindSpeedData | null>(null);
  const [buildingOpenings, setBuildingOpenings] = React.useState<BuildingOpening[]>([]);
  const [enclosureClassification, setEnclosureClassification] = React.useState<EnclosureClassification | null>(null);
  const [failureScenarioEnabled, setFailureScenarioEnabled] = React.useState(false);

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

  // Optimized calculation handler
  const handleCalculation = useCallback(async () => {
    const formData = form.getValues();
    
    // Validate before calculating
    const validation = await validateForm(formData);
    if (!validation.isValid) {
      return;
    }

    try {
      await startCalculation(formData, windSpeedData, calculateWindPressure);
    } catch (error) {
      console.error('Calculation failed:', error);
    }
  }, [form, windSpeedData, validateForm, startCalculation, calculateWindPressure]);

  // Optimized wind speed lookup
  const handleWindSpeedLookup = useCallback(async () => {
    const { city, state } = form.getValues();
    if (!city || !state) return;

    try {
      const data = await lookupWindSpeed(city, state);
      setWindSpeedData(data);
      form.setValue('customWindSpeed', data.value);
    } catch (error) {
      console.error('Wind speed lookup failed:', error);
    }
  }, [form, lookupWindSpeed]);

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
                      Cache Hit Rate: {performanceMetrics.cacheMetrics.hitRate.toFixed(1)}%
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
                          <MemoizedBuildingForm {...buildingFormProps} />
                          <MemoizedWindSpeedInput
                            form={form}
                            windSpeedData={windSpeedData}
                            onLookup={handleWindSpeedLookup}
                            isLoading={isLookingUp}
                          />
                        </TabsContent>

                        <TabsContent value="professional" className="space-y-4">
                          <MemoizedProfessionalForm form={form} />
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
                          {results && <ReportGenerator data={results} />}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  {/* Action buttons */}
                  <div className="flex gap-4">
                    <Button
                      onClick={handleCalculation}
                      disabled={isCalculating || validationState.errors.length > 0}
                      className="flex-1"
                    >
                      {isCalculating ? 'Calculating...' : 'Calculate Wind Pressures'}
                    </Button>
                  </div>
                </div>

                {/* Results Panel */}
                <div className="space-y-6">
                  {results && (
                    <MemoizedCalculationResults
                      data={results}
                      windSpeedData={windSpeedData}
                      formData={form.getValues()}
                    />
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

                  {/* Performance metrics */}
                  {process.env.NODE_ENV === 'development' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-2">
                        <div>Cache Hit Rate: {performanceMetrics.cacheMetrics.hitRate.toFixed(1)}%</div>
                        <div>Total Requests: {performanceMetrics.cacheMetrics.totalRequests}</div>
                        <div>Cache Entries: {performanceMetrics.cacheMetrics.cacheHits}</div>
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