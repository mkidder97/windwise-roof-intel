import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ASCEParameterData {
  topographicFactor: number;
  directionalityFactor: number;
  pressureCoefficients: {
    gcp_corner: number;
    gcp_field: number;
    gcp_perimeter: number;
  };
  source: 'database' | 'default';
  confidence: number;
}

export function useASCEParameterLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const lookupASCEParameters = useCallback(async (
    exposureCategory: string,
    asceEdition: string,
    buildingHeight: number,
    roofType: string
  ): Promise<ASCEParameterData> => {
    setIsLoading(true);
    console.log('🔍 Looking up ASCE parameters:', { exposureCategory, asceEdition, buildingHeight, roofType });
    
    try {
      // Lookup ASCE parameters from database
      const { data: asceParams, error: asceError } = await supabase
        .from('asce_parameters')
        .select('*')
        .eq('exposure_category', exposureCategory)
        .eq('edition', asceEdition)
        .maybeSingle();

      console.log('📊 ASCE parameters result:', { asceParams, asceError });

      // Lookup pressure coefficients
      const { data: pressureCoeffs, error: pressureError } = await supabase
        .from('pressure_coefficients_asce')
        .select('*')
        .eq('asce_edition', asceEdition)
        .eq('roof_type', roofType)
        .eq('building_type', 'low_rise') // Assuming low-rise for buildings under 60ft
        .maybeSingle();

      console.log('📊 Pressure coefficients result:', { pressureCoeffs, pressureError });

      if (asceParams && pressureCoeffs) {
        console.log('✅ Found ASCE parameters in database');
        return {
          topographicFactor: 1.0, // Default for flat terrain
          directionalityFactor: 0.85, // Standard for component & cladding
          pressureCoefficients: {
            gcp_corner: pressureCoeffs.gcp_corner,
            gcp_field: pressureCoeffs.gcp_field,
            gcp_perimeter: pressureCoeffs.gcp_perimeter
          },
          source: 'database',
          confidence: 95
        };
      }

      // Fallback to standard values
      console.log('⚠️ No ASCE parameters found, using standard values');
      return {
        topographicFactor: 1.0,
        directionalityFactor: 0.85,
        pressureCoefficients: {
          gcp_corner: -2.0,
          gcp_field: -1.0,
          gcp_perimeter: -1.5
        },
        source: 'default',
        confidence: 70
      };
      
    } catch (error) {
      console.error('💥 ASCE parameter lookup failed:', error);
      toast({
        title: "ASCE Parameter Lookup Error",
        description: `Failed to lookup ASCE parameters: ${error.message}`,
        variant: "destructive",
      });
      
      return {
        topographicFactor: 1.0,
        directionalityFactor: 0.85,
        pressureCoefficients: {
          gcp_corner: -2.0,
          gcp_field: -1.0,
          gcp_perimeter: -1.5
        },
        source: 'default',
        confidence: 0
      };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    lookupASCEParameters,
    isLoading
  };
}