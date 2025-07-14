import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  calculateKz,
  calculateEffectiveWindArea,
  classifyBuildingEnclosure,
  calculateNetPressure,
  interpolatePressureCoefficient,
  generateCalculationSummary,
  type BuildingOpening,
  type EnclosureClassification
} from '@/lib/asceCalculations';
import type { ProfessionalCalculationForm, ProfessionalCalculationResults, WindSpeedData } from '@/types/wind-calculator';

export function useWindCalculations() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<ProfessionalCalculationResults | null>(null);
  const { toast } = useToast();

  // Memoized calculation function for performance
  const performCalculation = useCallback(async (
    data: ProfessionalCalculationForm,
    windSpeedData?: WindSpeedData
  ): Promise<ProfessionalCalculationResults> => {
    const startTime = Date.now();
    
    try {
      if (data.professionalMode) {
        // Use professional edge function
        const windSpeed = windSpeedData?.value || data.customWindSpeed || 120;
        console.log(`Using wind speed: ${windSpeed} mph for professional calculation`);
        
        const { data: result, error } = await supabase.functions.invoke('calculate-professional-wind', {
          body: {
            buildingHeight: data.buildingHeight,
            buildingLength: data.buildingLength,
            buildingWidth: data.buildingWidth,
            city: data.city,
            state: data.state,
            asceEdition: data.asceEdition,
            windSpeed: windSpeed,
            exposureCategory: data.exposureCategory,
            buildingClassification: data.buildingClassification,
            riskCategory: data.riskCategory,
            calculationMethod: data.calculationMethod,
            includeInternalPressure: data.includeInternalPressure,
            topographicFactor: data.topographicFactor,
            directionalityFactor: data.directionalityFactor,
            projectName: data.projectName
          }
        });

        if (error) throw error;

        return {
          windSpeed: result.results.windSpeed,
          windSpeedSource: "database" as const,
          velocityPressure: result.results.velocityPressure,
          kzContinuous: result.results.kzContinuous,
          fieldPrimePressure: result.results.pressures.field_prime,
          fieldPressure: result.results.pressures.field,
          perimeterPressure: result.results.pressures.perimeter,
          cornerPressure: result.results.pressures.corner,
          maxPressure: result.results.maxPressure,
          controllingZone: result.results.controllingZone,
          professionalAccuracy: true,
          internalPressureIncluded: result.results.internalPressureIncluded,
          peReady: true,
          calculationId: result.calculation_id,
          requiresSpecialAnalysis: result.results.requiresSpecialAnalysis || false,
          simplifiedMethodApplicable: result.results.simplifiedMethodApplicable !== false,
          uncertaintyBounds: result.results.uncertaintyBounds || {
            lower: result.results.maxPressure * 0.95,
            upper: result.results.maxPressure * 1.05,
            confidence: 95
          },
          warnings: result.results.warnings || [],
          asceReferences: result.results.asceReferences || ["ASCE 7-22 Section 26.5"],
          methodologyUsed: "Professional Edge Function with Area-Dependent Coefficients",
          assumptions: result.results.assumptions || ["Standard atmospheric pressure", "Mean recurrence interval of 50 years"]
        };
      } else {
        // Enhanced basic calculation with professional ASCE formulas
        const windSpeed = windSpeedData?.value || data.customWindSpeed || 120;
        const height = data.buildingHeight;
        
        // Calculate Kz using exact ASCE 7 formula instead of hardcoded values
        const kzResult = calculateKz(height, data.exposureCategory);
        const kzFactor = kzResult.kz;

        const velocityPressure = 0.00256 * kzFactor * data.topographicFactor * data.directionalityFactor * Math.pow(windSpeed, 2);

        // Calculate effective wind areas for each zone
        const buildingArea = data.buildingLength * data.buildingWidth;
        const fieldArea = calculateEffectiveWindArea(data.buildingLength, data.buildingWidth, 'field');
        const perimeterArea = calculateEffectiveWindArea(Math.min(data.buildingLength, data.buildingWidth) / 10, 10, 'perimeter');
        const cornerArea = calculateEffectiveWindArea(10, 10, 'corner');

        // Get area-dependent pressure coefficients using ASCE interpolation
        const fieldCoeff = interpolatePressureCoefficient(fieldArea.area, 'field', data.calculationMethod === "component_cladding" ? 'component_cladding' : 'main_force');
        const perimeterCoeff = interpolatePressureCoefficient(perimeterArea.area, 'perimeter', data.calculationMethod === "component_cladding" ? 'component_cladding' : 'main_force');
        const cornerCoeff = interpolatePressureCoefficient(cornerArea.area, 'corner', data.calculationMethod === "component_cladding" ? 'component_cladding' : 'main_force');

        const fieldGCp = fieldCoeff.gcp;
        const perimeterGCp = perimeterCoeff.gcp;
        const cornerGCp = cornerCoeff.gcp;

        // Basic enclosure classification (default to enclosed for basic calculations)
        const basicEnclosure: EnclosureClassification = {
          type: 'enclosed',
          GCpi_positive: 0.18,
          GCpi_negative: -0.18,
          openingRatio: 0.005,
          hasDominantOpening: false,
          failureScenarioConsidered: false,
          windwardOpeningArea: 0,
          totalOpeningArea: buildingArea * 0.005,
          warnings: ["Basic calculation assumes enclosed building - verify actual enclosure classification"]
        };

        // Calculate external pressures
        const fieldPressure = Math.abs(velocityPressure * fieldGCp);
        const perimeterPressure = Math.abs(velocityPressure * perimeterGCp);
        const cornerPressure = Math.abs(velocityPressure * cornerGCp);

        // Calculate net pressures including internal pressure effects
        const fieldNet = calculateNetPressure(velocityPressure * fieldGCp, basicEnclosure);
        const perimeterNet = calculateNetPressure(velocityPressure * perimeterGCp, basicEnclosure);
        const cornerNet = calculateNetPressure(velocityPressure * cornerGCp, basicEnclosure);

        const maxPressure = Math.max(fieldNet.controlling, perimeterNet.controlling, cornerNet.controlling);

        let controllingZone = "Field";
        if (maxPressure === cornerNet.controlling) controllingZone = "Corner";
        else if (maxPressure === perimeterNet.controlling) controllingZone = "Perimeter";

        // Determine if special analysis is required
        const requiresSpecialAnalysis = height > 60 || data.buildingLength > 300 || data.buildingWidth > 300;
        const simplifiedMethodApplicable = height <= 60 && data.buildingLength <= 300 && data.buildingWidth <= 300;
        
        // Calculate uncertainty bounds
        const uncertaintyFactor = 0.1;
        const warnings: string[] = [
          ...kzResult.warnings,
          ...basicEnclosure.warnings
        ];
        
        if (requiresSpecialAnalysis) {
          warnings.push("Building exceeds simplified method limits - professional analysis recommended");
        }
        if (windSpeedData?.source === "interpolated") {
          warnings.push("Wind speed interpolated from nearby cities - verify with local code official");
        }
        if (windSpeedData?.source === "manual") {
          warnings.push("Using default wind speed - verify with ASCE 7 wind speed maps");
        }
        if (fieldCoeff.interpolated || perimeterCoeff.interpolated || cornerCoeff.interpolated) {
          warnings.push("Pressure coefficients interpolated between effective wind areas");
        }

        // Generate professional calculation summary
        const calculationSummary = generateCalculationSummary(
          kzResult,
          basicEnclosure,
          [fieldArea, perimeterArea, cornerArea],
          [fieldCoeff, perimeterCoeff, cornerCoeff]
        );

        return {
          windSpeed,
          windSpeedSource: windSpeedData?.source as any || "database",
          velocityPressure,
          kzContinuous: kzFactor,
          fieldPrimePressure: fieldPressure,
          fieldPressure,
          perimeterPressure,
          cornerPressure,
          maxPressure,
          controllingZone,
          professionalAccuracy: true,
          internalPressureIncluded: true,
          peReady: !requiresSpecialAnalysis,
          calculationId: null,
          requiresSpecialAnalysis,
          simplifiedMethodApplicable,
          uncertaintyBounds: {
            lower: maxPressure * (1 - uncertaintyFactor),
            upper: maxPressure * (1 + uncertaintyFactor),
            confidence: requiresSpecialAnalysis ? 70 : 85
          },
          warnings,
          asceReferences: calculationSummary.asceReferences,
          methodologyUsed: calculationSummary.methodology,
          assumptions: calculationSummary.assumptions,
          kzFactor
        };
      }
    } finally {
      const calculationTime = Date.now() - startTime;
      console.log(`Calculation completed in ${calculationTime}ms`);
    }
  }, [toast]);

  const calculateWindPressure = useCallback(async (
    formData: ProfessionalCalculationForm,
    windSpeedData?: WindSpeedData
  ): Promise<ProfessionalCalculationResults> => {
    setIsCalculating(true);
    
    try {
      const result = await performCalculation(formData, windSpeedData);
      setResults(result);
      return result;
    } catch (error) {
      console.error('Wind calculation failed:', error);
      toast({
        title: "Calculation Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsCalculating(false);
    }
  }, [performCalculation, toast]);

  const setCalculationResults = useCallback((newResults: ProfessionalCalculationResults | null) => {
    setResults(newResults);
  }, []);

  return {
    calculateWindPressure,
    isCalculating,
    results,
    setCalculationResults
  };
}