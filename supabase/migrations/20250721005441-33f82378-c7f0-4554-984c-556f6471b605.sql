-- Update external data sources to use OpenCage instead of Mapbox
INSERT INTO external_data_sources (service_name, api_endpoint, rate_limits, response_format, status) VALUES
('opencage', 'https://api.opencagedata.com/geocode/v1/json', 
 '{"requests_per_day": 2500, "requests_per_second": 1}', 
 '{"lat": "geometry.lat", "lng": "geometry.lng", "formatted": "formatted", "components": "components"}', 
 'active')
ON CONFLICT (service_name) DO UPDATE SET
  api_endpoint = EXCLUDED.api_endpoint,
  rate_limits = EXCLUDED.rate_limits,
  response_format = EXCLUDED.response_format,
  status = EXCLUDED.status,
  updated_at = now();

-- Remove Mapbox if it exists
DELETE FROM external_data_sources WHERE service_name = 'mapbox';

-- Update geocoding cache table to support OpenCage response format
ALTER TABLE geocoding_cache 
ADD COLUMN IF NOT EXISTS components JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS confidence INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS timezone_name TEXT;

-- Create index for faster OpenCage geocoding lookups
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_components ON geocoding_cache USING GIN(components);
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_country ON geocoding_cache(country_code);