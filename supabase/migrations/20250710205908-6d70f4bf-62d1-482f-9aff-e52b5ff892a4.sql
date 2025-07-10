-- Create professional wind calculations table
CREATE TABLE public.wind_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calculation_id UUID REFERENCES public.calculations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Professional calculation parameters
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('component_cladding', 'mwfrs')),
  effective_wind_area NUMERIC NOT NULL,
  internal_pressure_classification TEXT NOT NULL CHECK (internal_pressure_classification IN ('enclosed', 'partially_enclosed', 'open')),
  
  -- Area-dependent pressure coefficients
  gcp_field_interpolated NUMERIC NOT NULL,
  gcp_perimeter_interpolated NUMERIC NOT NULL,
  gcp_corner_interpolated NUMERIC NOT NULL,
  gcpi_positive NUMERIC NOT NULL,
  gcpi_negative NUMERIC NOT NULL,
  
  -- Professional pressure results
  pressure_field_prime NUMERIC NOT NULL, -- Zone 1' (field prime)
  pressure_field NUMERIC NOT NULL,       -- Zone 1 (field)
  pressure_perimeter NUMERIC NOT NULL,   -- Zone 2 (perimeter)
  pressure_corner NUMERIC NOT NULL,      -- Zone 3 (corner)
  
  -- Net pressures (including internal pressure)
  net_pressure_field_prime NUMERIC NOT NULL,
  net_pressure_field NUMERIC NOT NULL,
  net_pressure_perimeter NUMERIC NOT NULL,
  net_pressure_corner NUMERIC NOT NULL,
  
  -- Continuous Kz calculation
  kz_continuous NUMERIC NOT NULL,
  height_above_ground NUMERIC NOT NULL,
  
  -- Engineering validation
  requires_pe_seal BOOLEAN NOT NULL DEFAULT true,
  calculation_method_reference TEXT,
  asce_section_reference TEXT
);

-- Create area-dependent pressure coefficients table
CREATE TABLE public.pressure_coefficients_asce (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- ASCE edition and building parameters
  asce_edition TEXT NOT NULL DEFAULT 'ASCE 7-22',
  building_type TEXT NOT NULL CHECK (building_type IN ('enclosed', 'partially_enclosed')),
  roof_type TEXT NOT NULL,
  
  -- Area ranges for interpolation
  effective_wind_area_min NUMERIC NOT NULL,
  effective_wind_area_max NUMERIC NOT NULL,
  
  -- Pressure coefficients by zone
  gcp_field NUMERIC NOT NULL,
  gcp_perimeter NUMERIC NOT NULL,  
  gcp_corner NUMERIC NOT NULL,
  
  -- Metadata
  notes TEXT,
  table_reference TEXT -- ASCE table reference
);

-- Create internal pressure coefficients table
CREATE TABLE public.internal_pressure_coefficients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Building classification
  building_classification TEXT NOT NULL CHECK (building_classification IN ('enclosed', 'partially_enclosed', 'open')),
  enclosure_condition TEXT,
  
  -- Internal pressure coefficients
  gcpi_positive NUMERIC NOT NULL,
  gcpi_negative NUMERIC NOT NULL,
  
  -- ASCE reference
  asce_edition TEXT NOT NULL DEFAULT 'ASCE 7-22',
  table_reference TEXT,
  notes TEXT
);

-- Create engineering validations table
CREATE TABLE public.engineering_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Reference to calculation
  wind_calculation_id UUID REFERENCES public.wind_calculations(id),
  project_id UUID REFERENCES public.projects(id),
  
  -- Professional engineer information
  pe_license_number TEXT,
  pe_name TEXT,
  pe_state TEXT,
  pe_seal_date TIMESTAMP WITH TIME ZONE,
  
  -- Validation status
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected', 'revision_required')),
  validation_notes TEXT,
  
  -- Digital signature/seal
  digital_seal_hash TEXT,
  seal_document_url TEXT,
  
  -- Compliance verification
  asce_compliance_verified BOOLEAN DEFAULT false,
  local_code_compliance_verified BOOLEAN DEFAULT false,
  calculation_accuracy_verified BOOLEAN DEFAULT false
);

-- Add professional enhancements to existing tables

-- Enhance calculations table
ALTER TABLE public.calculations 
ADD COLUMN IF NOT EXISTS professional_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_pe_validation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS internal_pressure_included BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS area_dependent_coefficients BOOLEAN DEFAULT false;

-- Enhance projects table  
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS pe_seal_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS engineering_validation_status TEXT DEFAULT 'not_required' CHECK (engineering_validation_status IN ('not_required', 'pending', 'in_review', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS professional_calculation_type TEXT CHECK (professional_calculation_type IN ('preliminary', 'professional', 'pe_sealed'));

-- Add continuous Kz parameters to asce_parameters
ALTER TABLE public.asce_parameters
ADD COLUMN IF NOT EXISTS alpha_coefficient NUMERIC,
ADD COLUMN IF NOT EXISTS zg_gradient_height NUMERIC,
ADD COLUMN IF NOT EXISTS exposure_description TEXT,
ADD COLUMN IF NOT EXISTS applicable_terrain TEXT;

-- Enable Row Level Security
ALTER TABLE public.wind_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pressure_coefficients_asce ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_pressure_coefficients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineering_validations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access wind_calculations" 
ON public.wind_calculations FOR SELECT USING (true);

CREATE POLICY "Public read access pressure_coefficients_asce" 
ON public.pressure_coefficients_asce FOR SELECT USING (true);

CREATE POLICY "Public read access internal_pressure_coefficients" 
ON public.internal_pressure_coefficients FOR SELECT USING (true);

CREATE POLICY "Public read access engineering_validations" 
ON public.engineering_validations FOR SELECT USING (true);

-- Create policies for public insert access
CREATE POLICY "Public insert access wind_calculations" 
ON public.wind_calculations FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert access engineering_validations" 
ON public.engineering_validations FOR INSERT WITH CHECK (true);

-- Create update trigger for wind_calculations
CREATE TRIGGER update_wind_calculations_updated_at
BEFORE UPDATE ON public.wind_calculations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create update trigger for engineering_validations
CREATE TRIGGER update_engineering_validations_updated_at
BEFORE UPDATE ON public.engineering_validations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample area-dependent pressure coefficients (ASCE 7-22 Table 30.4-1)
INSERT INTO public.pressure_coefficients_asce (
  building_type, roof_type, effective_wind_area_min, effective_wind_area_max,
  gcp_field, gcp_perimeter, gcp_corner, table_reference
) VALUES
-- Enclosed buildings, flat roofs
('enclosed', 'flat', 10, 20, -0.18, -0.27, -0.35, 'ASCE 7-22 Table 30.4-1'),
('enclosed', 'flat', 20, 50, -0.18, -0.27, -0.35, 'ASCE 7-22 Table 30.4-1'),
('enclosed', 'flat', 50, 100, -0.18, -0.27, -0.35, 'ASCE 7-22 Table 30.4-1'),
('enclosed', 'flat', 100, 500, -0.18, -0.27, -0.35, 'ASCE 7-22 Table 30.4-1'),
('enclosed', 'flat', 500, 1000, -0.18, -0.27, -0.35, 'ASCE 7-22 Table 30.4-1'),
('enclosed', 'flat', 1000, 5000, -0.18, -0.27, -0.35, 'ASCE 7-22 Table 30.4-1');

-- Insert internal pressure coefficients (ASCE 7-22 Table 26.13-1)
INSERT INTO public.internal_pressure_coefficients (
  building_classification, enclosure_condition, gcpi_positive, gcpi_negative, table_reference
) VALUES
('enclosed', 'All openings conform to definition of enclosed building', 0.18, -0.18, 'ASCE 7-22 Table 26.13-1'),
('partially_enclosed', 'Does not comply with enclosed building requirements', 0.55, -0.55, 'ASCE 7-22 Table 26.13-1'),
('open', 'Each wall at least 80% open', 0.00, 0.00, 'ASCE 7-22 Table 26.13-1');

-- Update asce_parameters with continuous calculation parameters
UPDATE public.asce_parameters 
SET 
  alpha_coefficient = CASE exposure_category
    WHEN 'B' THEN 7.0
    WHEN 'C' THEN 9.5
    WHEN 'D' THEN 11.5
    ELSE 9.5
  END,
  zg_gradient_height = CASE exposure_category
    WHEN 'B' THEN 1200
    WHEN 'C' THEN 900
    WHEN 'D' THEN 700
    ELSE 900
  END,
  exposure_description = CASE exposure_category
    WHEN 'B' THEN 'Urban and suburban areas, wooded areas'
    WHEN 'C' THEN 'Open terrain with scattered obstructions'
    WHEN 'D' THEN 'Flat, unobstructed areas facing water'
    ELSE 'Open terrain with scattered obstructions'
  END
WHERE alpha_coefficient IS NULL;