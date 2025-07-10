-- Fix calculations table RLS policies to allow users to insert and select their own calculations
-- First drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own calculations" ON public.calculations;
DROP POLICY IF EXISTS "Users can update their own calculations" ON public.calculations;
DROP POLICY IF EXISTS "Public insert access" ON public.calculations;
DROP POLICY IF EXISTS "Public read access" ON public.calculations;
DROP POLICY IF EXISTS "Public read access calculations" ON public.calculations;

-- Create comprehensive RLS policies for calculations table
CREATE POLICY "Allow anonymous insert" ON public.calculations
FOR INSERT TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous select" ON public.calculations
FOR SELECT TO anon
USING (true);

CREATE POLICY "Allow authenticated users full access" ON public.calculations
FOR ALL TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Ensure public read access for material tables (these should already exist but let's verify)
DROP POLICY IF EXISTS "Public read access" ON public.roof_systems;
CREATE POLICY "Public read access for roof systems" ON public.roof_systems
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public read access" ON public.state_approvals;
CREATE POLICY "Public read access for state approvals" ON public.state_approvals
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public read access" ON public.wind_speeds;
CREATE POLICY "Public read access for wind speeds" ON public.wind_speeds
FOR SELECT
USING (true);

-- Update the calculations table to ensure user_id can be null for anonymous users
ALTER TABLE public.calculations ALTER COLUMN user_id DROP NOT NULL;