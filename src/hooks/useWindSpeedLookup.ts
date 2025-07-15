import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { WindSpeedData } from '@/types/wind-calculator';

interface WindSpeedValidation {
  isValid: boolean;
  source: string;
  confidence: number;
}

export function useWindSpeedLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [validation, setValidation] = useState<WindSpeedValidation>({
    isValid: false,
    source: "",
    confidence: 0
  });
  const { toast } = useToast();

  const lookupWindSpeed = useCallback(async (
    city: string, 
    state: string, 
    asceEdition: string
  ): Promise<WindSpeedData> => {
    setIsLoading(true);
    console.log('🔍 Looking up wind speed:', { city, state, asceEdition });
    
    // Normalize state to abbreviation if full name is provided
    const stateMapping: Record<string, string> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
    };
    
    const normalizedState = stateMapping[state] || state;
    console.log('🔄 Normalized state:', { original: state, normalized: normalizedState });
    
    try {
      // Test basic database connectivity first
      const { data: healthCheck, error: healthError } = await supabase
        .from('system_health')
        .select('*');
      
      console.log('📊 Database health check:', { healthCheck, healthError });
      
      if (healthError) {
        console.error('❌ Database connectivity failed:', healthError);
        throw new Error(`Database connectivity issue: ${healthError.message}`);
      }

      // First try exact match with detailed logging
      console.log('🎯 Attempting exact wind speed match...');
      const { data: exactMatch, error: exactError } = await supabase
        .from('wind_speeds')
        .select('*')
        .eq('city', city)
        .eq('state', normalizedState)
        .eq('asce_edition', asceEdition)
        .maybeSingle();

      console.log('🎯 Exact match result:', { exactMatch, exactError });

      if (exactError) {
        console.error('❌ Wind speed query error:', exactError);
        throw exactError;
      }

      if (exactMatch) {
        console.log('✅ Found exact wind speed match:', exactMatch.wind_speed, 'mph');
        const result: WindSpeedData = {
          value: exactMatch.wind_speed,
          source: 'database',
          confidence: 95,
          city,
          state,
          asceEdition
        };
        
        setValidation({
          isValid: true,
          source: 'database',
          confidence: 95
        });
        
        return result;
      }

      // If no exact match, find nearby cities
      console.log('🔍 No exact match, searching nearby cities...');
      const { data: nearbyCities, error: nearbyError } = await supabase
        .from('wind_speeds')
        .select('*')
        .eq('state', normalizedState)
        .eq('asce_edition', asceEdition)
        .limit(5);

      console.log('🏙️ Nearby cities result:', { nearbyCities, nearbyError });

      if (nearbyError) {
        console.error('❌ Nearby cities query error:', nearbyError);
        throw nearbyError;
      }

      if (nearbyCities && nearbyCities.length > 0) {
        const avgWindSpeed = nearbyCities.reduce((sum, city) => sum + city.wind_speed, 0) / nearbyCities.length;
        const interpolatedSpeed = Math.round(avgWindSpeed);
        
        console.log('🔄 Interpolated wind speed:', interpolatedSpeed, 'mph from', nearbyCities.length, 'nearby cities');
        
        const result: WindSpeedData = {
          value: interpolatedSpeed,
          source: 'interpolated',
          confidence: 80,
          city,
          state,
          asceEdition
        };
        
        setValidation({
          isValid: true,
          source: 'interpolated',
          confidence: 80
        });
        
        return result;
      }

      // Default fallback with warning
      console.warn('⚠️ No wind speed data found, using default 120 mph');
      
      const result: WindSpeedData = {
        value: 120,
        source: 'manual',
        confidence: 0,
        city,
        state,
        asceEdition
      };
      
      setValidation({
        isValid: false,
        source: 'default',
        confidence: 0
      });
      
      return result;
      
    } catch (error) {
      console.error('💥 Wind speed lookup failed:', error);
      toast({
        title: "Wind Speed Lookup Error",
        description: `Failed to lookup wind speed: ${error.message}`,
        variant: "destructive",
      });
      
      return {
        value: 120,
        source: 'manual',
        confidence: 0,
        city,
        state,
        asceEdition
      };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    lookupWindSpeed,
    isLoading,
    validation
  };
}