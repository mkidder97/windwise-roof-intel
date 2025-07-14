import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Save, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReportContext } from '@/hooks/useReportContext';

// Modular Components
import { BuildingParametersForm } from '@/components/forms/BuildingParametersForm';
import { WindSpeedInput } from '@/components/forms/WindSpeedInput';
import { ProfessionalParametersForm } from '@/components/forms/ProfessionalParametersForm';
import { CalculationResults } from '@/components/results/CalculationResults';
import { InternalPressureDisplay } from '@/components/results/InternalPressureDisplay';
import { EnclosureInput } from '@/components/EnclosureInput';
import { CalculationWarning } from '@/components/CalculationWarning';
import ProfessionalWindTab from '@/components/ProfessionalWindTab';
import ReportGenerator from '@/components/ReportGenerator';

// Business Logic Hooks
import { useWindSpeedLookup } from '@/hooks/useWindSpeedLookup';
import { useWindCalculations } from '@/hooks/useWindCalculations';
import { useProjectManager } from '@/hooks/useProjectManager';
import { useValidation } from '@/hooks/useValidation';

// Types
import type { 
  ProfessionalCalculationForm, 
  WindSpeedData, 
  BuildingDimensions, 
  LocationData 
} from '@/types/wind-calculator';
import { BuildingOpening, EnclosureClassification } from '@/lib/asceCalculations';

export default function WindCalculatorRefactored() {
  const [activeTab, setActiveTab] = useState("basic");
  const [windSpeedData, setWindSpeedData] = useState<WindSpeedData>({
    value: 120,
    source: 'manual',
    confidence: 0
  });
  const [buildingOpenings, setBuildingOpenings] = useState<BuildingOpening[]>([]);
  const [enclosureClassification, setEnclosureClassification] = useState<EnclosureClassification | null>(null);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { updateCalculationData } = useReportContext();

  // Business Logic Hooks
  const { lookupWindSpeed } = useWindSpeedLookup();
  const { calculateWindPressure, isCalculating, results, setCalculationResults } = useWindCalculations();
  const { saveCalculation, isSaving, loadCalculationHistory } = useProjectManager();
  const { validationState, validateForm } = useValidation();

  // Form Management
  const form = useForm<ProfessionalCalculationForm>({
    defaultValues: {
      projectName: "",
      buildingHeight: 30,
      buildingLength: 100,
      buildingWidth: 80,
      city: "",
      state: "",
      exposureCategory: "C",
      roofType: "Flat/Low Slope",
      deckType: "Steel",
      asceEdition: "ASCE 7-22",
      topographicFactor: 1.0,
      directionalityFactor: 0.85,
      calculationMethod: "component_cladding",
      buildingClassification: "enclosed",
      riskCategory: "II",
      includeInternalPressure: true,
      professionalMode: false,
      topographicType: "none",
      openingRatio: 0.1,
      effectiveWindArea: 100,
      engineeringNotes: "",
      revisionNumber: 1,
    },
  });

  useEffect(() => {
    loadCalculationHistory();
  }, [loadCalculationHistory]);

  const handleWindSpeedLookup = async () => {
    const formData = form.getValues();
    if (!formData.city || !formData.state) {
      toast({
        title: "Missing Information",
        description: "Please enter city and state for wind speed lookup",
        variant: "destructive",
      });
      return;
    }

    const result = await lookupWindSpeed(formData.city, formData.state, formData.asceEdition);
    setWindSpeedData(result);
  };

  const onSubmit = async (data: ProfessionalCalculationForm) => {
    // Validate form
    const validation = validateForm(data);
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    // Calculate wind pressures
    const calculationResults = await calculateWindPressure(data, windSpeedData);
    setCalculationResults(calculationResults);
    
    // Update report context
    updateCalculationData({ 
      results: calculationResults,
      buildingGeometry: {
        length: data.buildingLength,
        width: data.buildingWidth,
        height: data.buildingHeight,
        roofType: data.roofType,
        deckType: data.deckType
      },
      windParameters: data
    });
    
    toast({
      title: calculationResults.professionalAccuracy ? "Professional Calculation Complete" : "Calculation Complete",
      description: `Max pressure: ${calculationResults.maxPressure.toFixed(1)} psf`,
    });
  };

  const handleSave = async () => {
    if (!results) return;
    const formData = form.getValues();
    await saveCalculation(formData, results);
  };

  const findApprovedSystems = () => {
    if (!results) return;
    const formData = form.getValues();
    const searchParams = new URLSearchParams({
      maxWindPressure: results.maxPressure.toString(),
      deckType: formData.deckType,
      state: formData.state,
    });
    navigate(`/materials?${searchParams.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-engineering">
          <Calculator className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">ASCE Wind Pressure Calculator</h1>
          <p className="text-muted-foreground">Professional wind load calculations per ASCE 7 standards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Forms */}
        <div className="lg:col-span-2">
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Building Parameters */}
              <BuildingParametersForm />
              
              {/* Wind Speed Input */}
              <WindSpeedInput
                value={windSpeedData}
                location={{ city: form.watch('city'), state: form.watch('state') }}
                asceEdition={form.watch('asceEdition')}
                onChange={setWindSpeedData}
                onValidationChange={() => {}}
              />

              {/* Professional Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="professional">Professional</TabsTrigger>
                  <TabsTrigger value="enclosure">Enclosure</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <Button type="submit" disabled={isCalculating} className="w-full">
                    {isCalculating ? 'Calculating...' : 'Calculate Wind Pressures'}
                  </Button>
                </TabsContent>

                <TabsContent value="professional" className="space-y-4">
                  <ProfessionalParametersForm />
                  <Button 
                    type="button" 
                    onClick={() => {
                      form.setValue('professionalMode', true);
                      form.handleSubmit(onSubmit)();
                    }}
                    disabled={isCalculating}
                    className="w-full"
                  >
                    {isCalculating ? 'Calculating...' : 'Professional Calculation'}
                  </Button>
                </TabsContent>

                <TabsContent value="enclosure" className="space-y-4">
                  <EnclosureInput
                    buildingDimensions={{
                      height: form.watch('buildingHeight'),
                      length: form.watch('buildingLength'),
                      width: form.watch('buildingWidth')
                    }}
                    openings={buildingOpenings}
                    onOpeningsChange={setBuildingOpenings}
                    onEnclosureChange={setEnclosureClassification}
                    considerFailures={false}
                  />
                </TabsContent>

                <TabsContent value="reports" className="space-y-4">
                  <ReportGenerator />
                </TabsContent>
              </Tabs>
            </form>
          </FormProvider>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Button 
                  onClick={handleWindSpeedLookup} 
                  variant="outline" 
                  className="w-full"
                  disabled={!form.watch('city') || !form.watch('state')}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Lookup Wind Speed
                </Button>
                
                {results && (
                  <>
                    <Button onClick={handleSave} disabled={isSaving} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Calculation'}
                    </Button>
                    
                    <Button onClick={findApprovedSystems} variant="outline" className="w-full">
                      Find Approved Systems
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calculation Results */}
          {results && (
            <>
              <CalculationResults results={results} />
              <InternalPressureDisplay results={results} enclosureData={enclosureClassification} />
            </>
          )}

          {/* Warnings */}
          {validationState.warnings.length > 0 && (
            <CalculationWarning
              warnings={validationState.warnings}
              acknowledged={warningAcknowledged}
              onAcknowledge={setWarningAcknowledged}
            />
          )}
        </div>
      </div>
    </div>
  );
}