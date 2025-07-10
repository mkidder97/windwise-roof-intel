-- DEFINITIVE RLS POLICY FIX FOR ANONYMOUS ACCESS
-- Drop ALL existing policies that might conflict
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.calculations;
DROP POLICY IF EXISTS "Allow anonymous select" ON public.calculations;  
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.calculations;
DROP POLICY IF EXISTS "Users can insert their own calculations" ON public.calculations;
DROP POLICY IF EXISTS "Users can update their own calculations" ON public.calculations;
DROP POLICY IF EXISTS "Public insert access" ON public.calculations;
DROP POLICY IF EXISTS "Public read access" ON public.calculations;
DROP POLICY IF EXISTS "Public read access calculations" ON public.calculations;

DROP POLICY IF EXISTS "Public read access" ON public.roof_systems;
DROP POLICY IF EXISTS "Public read access for roof systems" ON public.roof_systems;

DROP POLICY IF EXISTS "Public read access" ON public.state_approvals;
DROP POLICY IF EXISTS "Public read access for state approvals" ON public.state_approvals;

DROP POLICY IF EXISTS "Public read access" ON public.wind_speeds;
DROP POLICY IF EXISTS "Public read access for wind speeds" ON public.wind_speeds;

-- Ensure RLS is enabled on all tables
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roof_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wind_speeds ENABLE ROW LEVEL SECURITY;

-- Create SIMPLE, WORKING policies for anonymous access
-- Calculations: Allow anonymous read/write for all records
CREATE POLICY "calculations_anonymous_all" ON public.calculations
FOR ALL TO anon
USING (true)
WITH CHECK (true);

-- Calculations: Allow authenticated users full access  
CREATE POLICY "calculations_authenticated_all" ON public.calculations
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Reference tables: Allow public read access to everyone
CREATE POLICY "roof_systems_public_read" ON public.roof_systems
FOR SELECT
USING (true);

CREATE POLICY "state_approvals_public_read" ON public.state_approvals
FOR SELECT  
USING (true);

CREATE POLICY "wind_speeds_public_read" ON public.wind_speeds
FOR SELECT
USING (true);

-- Ensure user_id can be null for anonymous users
ALTER TABLE public.calculations ALTER COLUMN user_id DROP NOT NULL;

-- Add helpful view to test database connectivity
CREATE OR REPLACE VIEW public.system_health AS
SELECT 
    'wind_speeds' as table_name,
    COUNT(*) as record_count,
    MIN(wind_speed) as min_wind_speed,
    MAX(wind_speed) as max_wind_speed
FROM public.wind_speeds
UNION ALL
SELECT 
    'roof_systems' as table_name,
    COUNT(*) as record_count,
    MIN(max_wind_pressure) as min_wind_speed,
    MAX(max_wind_pressure) as max_wind_speed  
FROM public.roof_systems
UNION ALL
SELECT
    'state_approvals' as table_name,
    COUNT(*) as record_count,
    NULL as min_wind_speed,
    NULL as max_wind_speed
FROM public.state_approvals
UNION ALL
SELECT
    'calculations' as table_name,
    COUNT(*) as record_count,
    NULL as min_wind_speed,
    NULL as max_wind_speed
FROM public.calculations;

-- Grant access to the health view
GRANT SELECT ON public.system_health TO anon, authenticated;