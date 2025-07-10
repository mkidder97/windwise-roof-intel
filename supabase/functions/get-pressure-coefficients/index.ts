import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { effectiveArea, buildingType, asceEdition = 'ASCE 7-22' } = await req.json()

    console.log('Coefficient lookup request:', {
      effectiveArea,
      buildingType,
      asceEdition
    })

    const { data: coeffData, error } = await supabase
      .from('pressure_coefficients_asce')
      .select('*')
      .eq('asce_edition', asceEdition)
      .eq('building_type', buildingType)
      .eq('roof_type', 'low_slope')
      .lte('effective_wind_area_min', effectiveArea)
      .gte('effective_wind_area_max', effectiveArea)
      .order('effective_wind_area_min', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Coefficient lookup error:', error)
      throw error
    }

    const coefficient = coeffData?.[0] || {
      gcp_field: -1.0,
      gcp_perimeter: -2.0, 
      gcp_corner: -3.0,
      table_reference: 'Fallback values',
      notes: 'Default coefficients used'
    }

    console.log('Found coefficient:', coefficient)

    return new Response(JSON.stringify({
      success: true,
      coefficient,
      effective_area: effectiveArea,
      interpolated: false,
      source: coefficient.table_reference || 'Professional database'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error('Coefficient function error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})