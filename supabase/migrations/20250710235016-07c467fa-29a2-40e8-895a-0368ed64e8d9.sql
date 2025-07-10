-- Create building_geometries table for storing building shapes and dimensions
CREATE TABLE public.building_geometries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  shape_type TEXT NOT NULL CHECK (shape_type IN ('rectangle', 'l_shape', 'complex')),
  dimensions JSONB NOT NULL DEFAULT '{}',
  zone_calculations JSONB DEFAULT '{}',
  cad_file_url TEXT,
  total_area DECIMAL(10,2),
  perimeter_length DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create building_templates table for pre-defined building types
CREATE TABLE public.building_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  building_type TEXT NOT NULL CHECK (building_type IN ('warehouse', 'office', 'retail', 'industrial', 'mixed_use', 'other')),
  geometry_data JSONB NOT NULL DEFAULT '{}',
  typical_wind_zones JSONB DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create effective_wind_areas table for detailed wind area calculations
CREATE TABLE public.effective_wind_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calculation_id UUID REFERENCES public.calculations(id) ON DELETE CASCADE,
  element_type TEXT NOT NULL CHECK (element_type IN ('fastener', 'panel', 'structural_member')),
  zone_location TEXT NOT NULL CHECK (zone_location IN ('field', 'perimeter', 'corner')),
  spacing_x DECIMAL(8,2),
  spacing_y DECIMAL(8,2),
  effective_area DECIMAL(10,2),
  pressure_coefficient DECIMAL(6,3),
  design_pressure DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to existing calculations table
ALTER TABLE public.calculations
ADD COLUMN building_geometry_id UUID REFERENCES public.building_geometries(id) ON DELETE SET NULL,
ADD COLUMN zone_specific_pressures JSONB DEFAULT '{}',
ADD COLUMN effective_areas_calculated JSONB DEFAULT '[]',
ADD COLUMN geometry_complexity_level TEXT CHECK (geometry_complexity_level IN ('basic', 'intermediate', 'complex')) DEFAULT 'basic';

-- Enable RLS on new tables
ALTER TABLE public.building_geometries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.effective_wind_areas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for building_geometries
CREATE POLICY "Public read access building_geometries"
ON public.building_geometries
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage building_geometries"
ON public.building_geometries
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Create RLS policies for building_templates
CREATE POLICY "Public read access building_templates"
ON public.building_templates
FOR SELECT
USING (true);

CREATE POLICY "Engineers can manage building_templates"
ON public.building_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('engineer', 'admin')
  )
);

-- Create RLS policies for effective_wind_areas
CREATE POLICY "Public read access effective_wind_areas"
ON public.effective_wind_areas
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage effective_wind_areas"
ON public.effective_wind_areas
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_building_geometries_updated_at
BEFORE UPDATE ON public.building_geometries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_building_templates_updated_at
BEFORE UPDATE ON public.building_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_effective_wind_areas_updated_at
BEFORE UPDATE ON public.effective_wind_areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create performance indexes
CREATE INDEX idx_building_geometries_shape_type ON public.building_geometries(shape_type);
CREATE INDEX idx_building_geometries_name ON public.building_geometries(name);
CREATE INDEX idx_building_templates_building_type ON public.building_templates(building_type);
CREATE INDEX idx_building_templates_active ON public.building_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_effective_wind_areas_calculation_id ON public.effective_wind_areas(calculation_id);
CREATE INDEX idx_effective_wind_areas_element_type ON public.effective_wind_areas(element_type);
CREATE INDEX idx_effective_wind_areas_zone_location ON public.effective_wind_areas(zone_location);
CREATE INDEX idx_calculations_geometry_id ON public.calculations(building_geometry_id);
CREATE INDEX idx_calculations_complexity_level ON public.calculations(geometry_complexity_level);

-- Insert sample building templates
INSERT INTO public.building_templates (template_name, building_type, geometry_data, typical_wind_zones, description) VALUES
('Standard Warehouse', 'warehouse', 
 '{"length": 200, "width": 100, "height": 30, "shape": "rectangle"}',
 '{"field_zone": {"gcp": -0.9}, "perimeter_zone": {"gcp": -1.4}, "corner_zone": {"gcp": -2.0}}',
 'Typical single-story warehouse with standard proportions'),
('Office Building', 'office', 
 '{"length": 150, "width": 80, "height": 40, "shape": "rectangle"}',
 '{"field_zone": {"gcp": -0.9}, "perimeter_zone": {"gcp": -1.4}, "corner_zone": {"gcp": -2.0}}',
 'Multi-story office building with standard wind zones'),
('Retail Strip Center', 'retail', 
 '{"length": 300, "width": 60, "height": 20, "shape": "rectangle"}',
 '{"field_zone": {"gcp": -0.9}, "perimeter_zone": {"gcp": -1.4}, "corner_zone": {"gcp": -2.0}}',
 'Long, narrow retail building typical of strip centers');