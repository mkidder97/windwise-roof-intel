-- Create geocoding cache table first
CREATE TABLE IF NOT EXISTS geocoding_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  formatted_address TEXT,
  components JSONB DEFAULT '{}',
  confidence INTEGER DEFAULT 0,
  country_code TEXT,
  timezone_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

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

-- Enable RLS on both tables
ALTER TABLE geocoding_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_data_sources ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Public access geocoding_cache" ON geocoding_cache FOR ALL USING (true);
CREATE POLICY "Public read access external_data_sources" ON external_data_sources FOR SELECT USING (true);

-- Insert OpenCage configuration
INSERT INTO external_data_sources (service_name, api_endpoint, rate_limits, response_format, status) VALUES
('opencage', 'https://api.opencagedata.com/geocode/v1/json', 
 '{"requests_per_day": 2500, "requests_per_second": 1}', 
 '{"lat": "geometry.lat", "lng": "geometry.lng", "formatted": "formatted", "components": "components"}', 
 'active');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_address ON geocoding_cache(address);
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_components ON geocoding_cache USING GIN(components);
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_country ON geocoding_cache(country_code);
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_expires ON geocoding_cache(expires_at);

-- Create trigger for updated_at on external_data_sources
CREATE TRIGGER update_external_data_sources_updated_at
  BEFORE UPDATE ON external_data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();