-- Create roof_systems table
CREATE TABLE public.roof_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  system_name TEXT NOT NULL,
  membrane_type TEXT NOT NULL,
  max_wind_pressure INTEGER NOT NULL,
  deck_types TEXT[] NOT NULL,
  fastener_pattern TEXT,
  safety_factor NUMERIC DEFAULT 1.0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create state_approvals table
CREATE TABLE public.state_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id UUID REFERENCES public.roof_systems(id),
  approval_number TEXT NOT NULL,
  state TEXT NOT NULL,
  approval_agency TEXT NOT NULL,
  approval_date DATE,
  expiration_date DATE,
  status TEXT DEFAULT 'active',
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roof_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for roof_systems
CREATE POLICY "Public read access" 
ON public.roof_systems 
FOR SELECT 
USING (true);

-- Create RLS policies for state_approvals
CREATE POLICY "Public read access" 
ON public.state_approvals 
FOR SELECT 
USING (true);

-- Add trigger for updated_at on roof_systems
CREATE TRIGGER update_roof_systems_updated_at
BEFORE UPDATE ON public.roof_systems
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for roof_systems
INSERT INTO public.roof_systems (manufacturer, system_name, membrane_type, max_wind_pressure, deck_types, fastener_pattern, safety_factor, description) VALUES
('GAF', 'EverGuard TPO System', 'TPO', 120, ARRAY['Steel', 'Concrete', 'Wood'], 'Mechanically Attached', 1.5, 'High-performance TPO membrane with mechanically attached installation'),
('GAF', 'EverGuard Extreme TPO', 'TPO', 180, ARRAY['Steel', 'Concrete'], 'Fully Adhered', 2.0, 'Premium TPO system for high wind zones'),
('Firestone', 'UltraPly TPO', 'TPO', 150, ARRAY['Steel', 'Concrete', 'Wood'], 'Ballasted', 1.8, 'Ballasted TPO system for superior wind resistance'),
('Carlisle', 'Sure-Weld TPO', 'TPO', 135, ARRAY['Steel', 'Concrete'], 'Mechanically Attached', 1.6, 'Proven TPO technology with excellent weatherability'),
('Johns Manville', 'JM TPO', 'TPO', 110, ARRAY['Steel', 'Wood'], 'Mechanically Attached', 1.4, 'Cost-effective TPO solution for standard applications'),
('GAF', 'Liberty SBS Modified', 'Modified Bitumen', 95, ARRAY['Steel', 'Concrete', 'Wood'], 'Torch Applied', 1.3, 'Traditional modified bitumen with torch application'),
('Firestone', 'RubberGard EPDM', 'EPDM', 140, ARRAY['Steel', 'Concrete'], 'Fully Adhered', 1.7, 'Single-ply EPDM membrane with excellent durability'),
('Carlisle', 'CCW-705 EPDM', 'EPDM', 125, ARRAY['Steel', 'Concrete', 'Wood'], 'Ballasted', 1.5, 'Ballasted EPDM system for long-term performance'),
('Johns Manville', 'JM EPDM', 'EPDM', 105, ARRAY['Steel', 'Wood'], 'Mechanically Attached', 1.2, 'Reliable EPDM solution for residential and commercial use'),
('GAF', 'StormGuard HD', 'TPO', 200, ARRAY['Steel', 'Concrete'], 'Fully Adhered', 2.2, 'Heavy-duty TPO system designed for extreme weather conditions');

-- Insert sample state approvals
INSERT INTO public.state_approvals (system_id, approval_number, state, approval_agency, approval_date, expiration_date, status, document_url) VALUES
((SELECT id FROM public.roof_systems WHERE system_name = 'EverGuard TPO System' LIMIT 1), 'FL-12345', 'FL', 'Florida Building Code', '2023-01-15', '2026-01-15', 'active', 'https://example.com/fl-approval-1.pdf'),
((SELECT id FROM public.roof_systems WHERE system_name = 'EverGuard Extreme TPO' LIMIT 1), 'TX-67890', 'TX', 'Texas Department of Insurance', '2023-03-20', '2026-03-20', 'active', 'https://example.com/tx-approval-1.pdf'),
((SELECT id FROM public.roof_systems WHERE system_name = 'UltraPly TPO' LIMIT 1), 'FL-11111', 'FL', 'Miami-Dade County', '2023-02-10', '2026-02-10', 'active', 'https://example.com/fl-approval-2.pdf'),
((SELECT id FROM public.roof_systems WHERE system_name = 'Sure-Weld TPO' LIMIT 1), 'CA-22222', 'CA', 'California Building Standards Commission', '2023-04-05', '2026-04-05', 'active', 'https://example.com/ca-approval-1.pdf'),
((SELECT id FROM public.roof_systems WHERE system_name = 'StormGuard HD' LIMIT 1), 'FL-33333', 'FL', 'Florida Building Code', '2023-05-12', '2026-05-12', 'active', 'https://example.com/fl-approval-3.pdf'),
((SELECT id FROM public.roof_systems WHERE system_name = 'StormGuard HD' LIMIT 1), 'TX-44444', 'TX', 'Texas Department of Insurance', '2023-06-01', '2026-06-01', 'active', 'https://example.com/tx-approval-2.pdf');