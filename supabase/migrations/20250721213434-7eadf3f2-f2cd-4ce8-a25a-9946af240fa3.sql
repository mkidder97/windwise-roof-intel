-- Create external data sources table for OpenCage API configuration
CREATE TABLE IF NOT EXISTS external_data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL UNIQUE,
  api_endpoint TEXT NOT NULL,
  rate_limits JSONB DEFAULT '{}',
  response_format JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE external_data_sources ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access external_data_sources" 
ON external_data_sources FOR SELECT 
USING (true);

-- Insert OpenCage configuration
INSERT INTO external_data_sources (service_name, api_endpoint, rate_limits, response_format, status) VALUES
('opencage', 'https://api.opencagedata.com/geocode/v1/json', 
 '{"requests_per_day": 2500, "requests_per_second": 1}', 
 '{"lat": "geometry.lat", "lng": "geometry.lng", "formatted": "formatted", "components": "components"}', 
 'active');

-- Update geocoding cache table to support OpenCage response format
ALTER TABLE geocoding_cache 
ADD COLUMN IF NOT EXISTS components JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS confidence INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS timezone_name TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_components ON geocoding_cache USING GIN(components);
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_country ON geocoding_cache(country_code);

-- Create trigger for updated_at
CREATE TRIGGER update_external_data_sources_updated_at
  BEFORE UPDATE ON external_data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();