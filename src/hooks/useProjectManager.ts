import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProfessionalCalculationForm, ProfessionalCalculationResults, EngineerVerification } from '@/types/wind-calculator';

interface SavedCalculation {
  id: string;
  project_name: string;
  created_at: string;
  input_parameters: any; // Use any for database JSON type
  results: any; // Use any for database JSON type
  max_pressure: number;
  city: string;
  state: string;
}

export function useProjectManager() {
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadCalculationHistory = useCallback(async () => {
    setIsLoading(true);
    console.log('Loading calculation history...');
    
    try {
      const { data, error } = await supabase
        .from('calculations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('Calculation history query result:', { data, error });

      if (error) {
        console.error('Error loading calculation history:', error);
        throw error;
      }
      
      setSavedCalculations(data || []);
      console.log(`Loaded ${data?.length || 0} saved calculations`);
      
    } catch (error) {
      console.error('Error loading calculation history:', error);
      toast({
        title: "Error",
        description: `Failed to load calculation history: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const saveCalculation = useCallback(async (
    formData: ProfessionalCalculationForm,
    results: ProfessionalCalculationResults,
    verification?: EngineerVerification
  ) => {
    if (!results) {
      console.error('❌ No calculation results to save');
      toast({
        title: "Save Error", 
        description: "No calculation results to save",
        variant: "destructive",
      });
      return null;
    }
    
    setIsSaving(true);
    
    console.log('💾 Saving calculation...', { formData, results });
    
    try {
      // Test database connectivity first
      const { data: healthCheck } = await supabase
        .from('system_health')
        .select('*');
      
      console.log('📊 Pre-save health check:', healthCheck);

      const calculationData = {
        project_name: formData.projectName || 'Untitled Project',
        building_height: formData.buildingHeight,
        building_length: formData.buildingLength,
        building_width: formData.buildingWidth,
        city: formData.city,
        state: formData.state,
        exposure_category: formData.exposureCategory,
        roof_type: formData.roofType,
        deck_type: formData.deckType,
        asce_edition: formData.asceEdition,
        wind_speed: results.windSpeed,
        topographic_factor: formData.topographicFactor,
        directionality_factor: formData.directionalityFactor,
        calculation_method: formData.calculationMethod,
        field_pressure: results.fieldPressure,
        perimeter_pressure: results.perimeterPressure,
        corner_pressure: results.cornerPressure,
        max_pressure: results.maxPressure,
        professional_mode: formData.professionalMode,
        requires_pe_validation: results.peReady || false,
        internal_pressure_included: results.internalPressureIncluded,
        area_dependent_coefficients: results.professionalAccuracy,
        input_parameters: formData as any,
        results: results as any,
        user_id: null, // Allow anonymous saves
        // Engineer verification fields
        engineer_verified: verification?.isVerified || false,
        engineer_name: verification?.engineerName || null,
        engineer_license: verification?.engineerLicense || null,
        engineer_state: verification?.engineerState || null,
        verification_date: verification?.isVerified ? new Date().toISOString() : null,
      };

      console.log('📝 Inserting calculation data:', calculationData);

      const { data, error } = await supabase
        .from('calculations')
        .insert(calculationData)
        .select();

      console.log('💾 Calculation save result:', { data, error });

      if (error) {
        console.error('❌ Save calculation error:', error);
        throw error;
      }

      console.log('✅ Calculation saved successfully');
      
      toast({
        title: "Calculation Saved",
        description: `${results.professionalAccuracy ? 'Professional' : 'Basic'} calculation saved successfully.`,
      });

      // Reload calculation history
      await loadCalculationHistory();
      
      return data[0];

    } catch (error) {
      console.error('💥 Failed to save calculation:', error);
      toast({
        title: "Save Error",
        description: `Failed to save: ${error.message}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [toast, loadCalculationHistory]);

  const loadCalculation = useCallback((calculationId: string) => {
    const calculation = savedCalculations.find(calc => calc.id === calculationId);
    if (calculation) {
      return {
        formData: calculation.input_parameters,
        results: calculation.results
      };
    }
    return null;
  }, [savedCalculations]);

  return {
    savedCalculations,
    isLoading,
    isSaving,
    loadCalculationHistory,
    saveCalculation,
    loadCalculation
  };
}