-- Create comprehensive database schema for ASCE wind pressure calculator

-- Wind speeds database with ASCE edition and local modifications
CREATE TABLE public.wind_speeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  county TEXT,
  wind_speed INTEGER NOT NULL,
  asce_edition TEXT NOT NULL DEFAULT 'ASCE 7-22',
  local_modifications JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ASCE parameters for different editions and jurisdictions
CREATE TABLE public.asce_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition TEXT NOT NULL,
  state TEXT,
  exposure_category TEXT NOT NULL,
  height_range TEXT NOT NULL,
  kz_factor DECIMAL(4,3) NOT NULL,
  pressure_coefficients JSONB NOT NULL,
  formula_variations JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Roof systems database
CREATE TABLE public.roof_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT NOT NULL,
  system_name TEXT NOT NULL,
  membrane_type TEXT NOT NULL,
  max_wind_pressure INTEGER NOT NULL,
  deck_types TEXT[] NOT NULL,
  fastener_pattern TEXT,
  safety_factor DECIMAL(3,2) DEFAULT 1.0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- State and local approvals tracking
CREATE TABLE public.state_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID REFERENCES public.roof_systems(id) ON DELETE CASCADE,
  approval_number TEXT NOT NULL,
  state TEXT NOT NULL,
  approval_agency TEXT NOT NULL,
  approval_date DATE,
  expiration_date DATE,
  status TEXT DEFAULT 'active',
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Local jurisdictions and requirements
CREATE TABLE public.local_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_name TEXT NOT NULL,
  state TEXT NOT NULL,
  county TEXT,
  city TEXT,
  requirements JSONB DEFAULT '{}',
  contact_info JSONB DEFAULT '{}',
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Building codes by state
CREATE TABLE public.building_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  code_edition TEXT NOT NULL,
  asce_edition TEXT NOT NULL,
  modifications JSONB DEFAULT '{}',
  adoption_date DATE,
  wind_speed_adjustments JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User calculations history
CREATE TABLE public.calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  building_height DECIMAL(6,2) NOT NULL,
  building_length DECIMAL(8,2),
  building_width DECIMAL(8,2),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  exposure_category TEXT NOT NULL,
  roof_type TEXT NOT NULL,
  deck_type TEXT NOT NULL,
  asce_edition TEXT NOT NULL,
  jurisdiction TEXT,
  wind_speed INTEGER NOT NULL,
  topographic_factor DECIMAL(3,2) DEFAULT 1.0,
  directionality_factor DECIMAL(3,2) DEFAULT 0.85,
  calculation_method TEXT NOT NULL,
  field_pressure DECIMAL(6,2),
  perimeter_pressure DECIMAL(6,2),
  corner_pressure DECIMAL(6,2),
  max_pressure DECIMAL(6,2),
  input_parameters JSONB NOT NULL,
  results JSONB NOT NULL,
  selected_systems UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- System components for detailed approval tracking
CREATE TABLE public.system_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID REFERENCES public.roof_systems(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL,
  component_name TEXT NOT NULL,
  manufacturer TEXT,
  approval_numbers JSONB DEFAULT '{}',
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Approval agencies directory
CREATE TABLE public.approval_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name TEXT NOT NULL,
  state TEXT,
  jurisdiction_level TEXT NOT NULL,
  requirements TEXT,
  website TEXT,
  contact_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (for future user authentication)
ALTER TABLE public.wind_speeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asce_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roof_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_agencies ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust later for user-specific access)
CREATE POLICY "Public read access" ON public.wind_speeds FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.asce_parameters FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.roof_systems FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.state_approvals FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.local_jurisdictions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.building_codes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.calculations FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.system_components FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.approval_agencies FOR SELECT USING (true);

-- Allow public insert for calculations
CREATE POLICY "Public insert access" ON public.calculations FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_wind_speeds_location ON public.wind_speeds(state, city);
CREATE INDEX idx_wind_speeds_asce ON public.wind_speeds(asce_edition);
CREATE INDEX idx_roof_systems_pressure ON public.roof_systems(max_wind_pressure);
CREATE INDEX idx_state_approvals_system ON public.state_approvals(system_id);
CREATE INDEX idx_state_approvals_state ON public.state_approvals(state);
CREATE INDEX idx_calculations_location ON public.calculations(state, city);
CREATE INDEX idx_calculations_created ON public.calculations(created_at DESC);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_wind_speeds_updated_at
  BEFORE UPDATE ON public.wind_speeds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roof_systems_updated_at
  BEFORE UPDATE ON public.roof_systems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calculations_updated_at
  BEFORE UPDATE ON public.calculations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();