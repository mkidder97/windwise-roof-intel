
-- WindWise Database Enhancements for ASCE Compliance Master Agent
-- Additional tables and data sources needed for accurate calculations

-- 1. Enhanced Building Code Mapping Table
CREATE TABLE IF NOT EXISTS public.building_code_mappings (
    id SERIAL PRIMARY KEY,
    jurisdiction TEXT NOT NULL,
    state TEXT NOT NULL,
    county TEXT,
    city TEXT,
    current_building_code TEXT NOT NULL,
    asce_edition TEXT NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    special_requirements JSONB,
    hvhz_zone BOOLEAN DEFAULT false,
    seismic_design_category TEXT,
    ice_load_required BOOLEAN DEFAULT false,
    coastal_zone BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Topographic Factor Reference Table
CREATE TABLE IF NOT EXISTS public.topographic_factors (
    id SERIAL PRIMARY KEY,
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(11,7) NOT NULL,
    elevation_ft INTEGER NOT NULL,
    terrain_category TEXT NOT NULL, -- 'hill', 'ridge', 'escarpment', 'valley'
    kzt_factor NUMERIC(4,2) NOT NULL,
    asce_edition TEXT NOT NULL,
    source TEXT, -- 'USGS', 'manual_calculation', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Exposure Category Reference Data
CREATE TABLE IF NOT EXISTS public.exposure_categories (
    id SERIAL PRIMARY KEY,
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(11,7) NOT NULL,
    radius_miles INTEGER DEFAULT 1,
    exposure_category TEXT NOT NULL CHECK (exposure_category IN ('B', 'C', 'D')),
    land_use_description TEXT,
    roughness_length NUMERIC(6,3),
    confidence_level INTEGER DEFAULT 80,
    data_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enhanced Wind Speed Table with Multiple Editions
ALTER TABLE public.wind_speeds 
ADD COLUMN IF NOT EXISTS ultimate_design_wind_speed INTEGER,
ADD COLUMN IF NOT EXISTS service_level_wind_speed INTEGER,
ADD COLUMN IF NOT EXISTS importance_factor NUMERIC(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS risk_category_numeric INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS wind_directionality_factor NUMERIC(3,2) DEFAULT 0.85,
ADD COLUMN IF NOT EXISTS ground_elevation_factor NUMERIC(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'ASCE Maps',
ADD COLUMN IF NOT EXISTS last_verified TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. ASCE Pressure Coefficients by Edition
CREATE TABLE IF NOT EXISTS public.asce_pressure_coefficients (
    id SERIAL PRIMARY KEY,
    asce_edition TEXT NOT NULL,
    building_type TEXT NOT NULL, -- 'low-rise', 'high-rise', 'open'
    roof_zone TEXT NOT NULL CHECK (roof_zone IN ('field', 'perimeter', 'corner')),
    roof_slope_degrees NUMERIC(4,1) DEFAULT 0,
    gcp_external NUMERIC(4,2) NOT NULL,
    gcp_internal_enclosed NUMERIC(4,2) DEFAULT 0.18,
    gcp_internal_partially_enclosed NUMERIC(4,2) DEFAULT 0.55,
    height_factor_applicable BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Manufacturer System Performance Data
CREATE TABLE IF NOT EXISTS public.system_performance_data (
    id SERIAL PRIMARY KEY,
    system_id INTEGER REFERENCES public.roof_systems(id),
    test_method TEXT NOT NULL, -- 'ASTM D6878', 'FM 4470', 'UL 580', etc.
    test_pressure_psf NUMERIC(6,2) NOT NULL,
    test_duration_minutes INTEGER,
    failure_mode TEXT,
    safety_factor_tested NUMERIC(4,2),
    test_date DATE,
    testing_laboratory TEXT,
    report_number TEXT,
    ambient_temperature_f INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Real-time Weather and Geographic Data Sources
CREATE TABLE IF NOT EXISTS public.external_data_sources (
    id SERIAL PRIMARY KEY,
    source_name TEXT NOT NULL,
    api_endpoint TEXT NOT NULL,
    api_key_env_var TEXT, -- Environment variable name for API key
    data_type TEXT NOT NULL, -- 'geocoding', 'elevation', 'weather', 'building_codes'
    rate_limit_per_minute INTEGER DEFAULT 60,
    cache_duration_minutes INTEGER DEFAULT 1440, -- 24 hours
    active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default external data sources
INSERT INTO public.external_data_sources (source_name, api_endpoint, data_type, rate_limit_per_minute, cache_duration_minutes) VALUES
('Mapbox Geocoding', 'https://api.mapbox.com/geocoding/v5/mapbox.places', 'geocoding', 600, 10080), -- 7 days
('USGS Elevation API', 'https://nationalmap.gov/epqs/pqs.php', 'elevation', 1000, 43200), -- 30 days
('OpenWeatherMap', 'https://api.openweathermap.org/data/2.5', 'weather', 1000, 60), -- 1 hour
('ICC Digital Codes', 'https://codes.iccsafe.org/api/v1', 'building_codes', 100, 1440), -- 24 hours
('NOAA Weather', 'https://api.weather.gov', 'weather', 300, 60); -- 1 hour

-- 8. Enhanced Calculation Cache Table
CREATE TABLE IF NOT EXISTS public.calculation_cache (
    id SERIAL PRIMARY KEY,
    address_hash TEXT NOT NULL, -- MD5 hash of normalized address
    coordinates POINT NOT NULL,
    building_parameters JSONB NOT NULL,
    asce_edition TEXT NOT NULL,
    wind_speed INTEGER NOT NULL,
    exposure_category TEXT NOT NULL,
    kzt_factor NUMERIC(4,2) NOT NULL,
    uplift_pressures JSONB NOT NULL, -- {field, perimeter, corner}
    calculation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    cache_version TEXT DEFAULT '1.0'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calculation_cache_address_hash ON public.calculation_cache(address_hash);
CREATE INDEX IF NOT EXISTS idx_calculation_cache_coordinates ON public.calculation_cache USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_wind_speeds_location ON public.wind_speeds(state, city);
CREATE INDEX IF NOT EXISTS idx_roof_systems_performance ON public.roof_systems(max_wind_pressure, membrane_type);

-- 9. Insert comprehensive ASCE pressure coefficients
INSERT INTO public.asce_pressure_coefficients (asce_edition, building_type, roof_zone, gcp_external, gcp_internal_enclosed, gcp_internal_partially_enclosed) VALUES
-- ASCE 7-22 Low-Rise Building Coefficients
('ASCE 7-22', 'low-rise', 'field', -0.9, 0.18, 0.55),
('ASCE 7-22', 'low-rise', 'perimeter', -1.8, 0.18, 0.55),
('ASCE 7-22', 'low-rise', 'corner', -2.8, 0.18, 0.55),

-- ASCE 7-16 Low-Rise Building Coefficients  
('ASCE 7-16', 'low-rise', 'field', -0.9, 0.18, 0.55),
('ASCE 7-16', 'low-rise', 'perimeter', -1.8, 0.18, 0.55),
('ASCE 7-16', 'low-rise', 'corner', -2.8, 0.18, 0.55),

-- ASCE 7-10 Low-Rise Building Coefficients
('ASCE 7-10', 'low-rise', 'field', -0.9, 0.18, 0.55),
('ASCE 7-10', 'low-rise', 'perimeter', -1.8, 0.18, 0.55),
('ASCE 7-10', 'low-rise', 'corner', -2.7, 0.18, 0.55),

-- ASCE 7-05 Low-Rise Building Coefficients
('ASCE 7-05', 'low-rise', 'field', -0.9, 0.18, 0.55),
('ASCE 7-05', 'low-rise', 'perimeter', -1.8, 0.18, 0.55),
('ASCE 7-05', 'low-rise', 'corner', -2.7, 0.18, 0.55);

-- 10. Sample building code mappings for major jurisdictions
INSERT INTO public.building_code_mappings (jurisdiction, state, current_building_code, asce_edition, effective_date, special_requirements, hvhz_zone, coastal_zone) VALUES
('Miami-Dade County', 'FL', 'IBC 2024', 'ASCE 7-22', '2024-01-01', '{"hvhz": true, "miami_dade_noa_required": true}', true, true),
('Broward County', 'FL', 'IBC 2024', 'ASCE 7-22', '2024-01-01', '{"hvhz": true, "miami_dade_noa_required": true}', true, true),
('Harris County', 'TX', 'IBC 2021', 'ASCE 7-16', '2023-01-01', '{"wind_borne_debris": true}', false, true),
('Los Angeles County', 'CA', 'IBC 2024', 'ASCE 7-22', '2024-01-01', '{"seismic_design_category": "D", "fire_rating_required": true}', false, false),
('Cook County', 'IL', 'IBC 2021', 'ASCE 7-16', '2022-01-01', '{"snow_load_critical": true}', false, false),
('New York City', 'NY', 'NYC Building Code 2022', 'ASCE 7-16', '2022-01-01', '{"nyc_specific_requirements": true}', false, false);

-- 11. Functions for real-time calculations

-- Function to get exposure category for coordinates
CREATE OR REPLACE FUNCTION public.get_exposure_category(lat NUMERIC, lng NUMERIC)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- First check if we have specific data for this location
    SELECT exposure_category INTO result
    FROM public.exposure_categories
    WHERE ST_DWithin(
        ST_Point(lng, lat)::geography,
        ST_Point(longitude, latitude)::geography,
        radius_miles * 1609.34  -- Convert miles to meters
    )
    ORDER BY confidence_level DESC
    LIMIT 1;
    
    -- If no specific data, use general rules
    IF result IS NULL THEN
        -- Coastal areas default to C or D
        IF public.is_coastal_location(lat, lng) THEN
            result := 'C';
        ELSE
            result := 'B'; -- Conservative default for inland
        END IF;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if location is coastal
CREATE OR REPLACE FUNCTION public.is_coastal_location(lat NUMERIC, lng NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
    -- Simplified coastal detection for US
    RETURN (
        -- Atlantic Coast
        (lat BETWEEN 25 AND 45 AND lng BETWEEN -85 AND -65) OR
        -- Gulf Coast  
        (lat BETWEEN 25 AND 32 AND lng BETWEEN -100 AND -80) OR
        -- Pacific Coast
        (lat BETWEEN 32 AND 50 AND lng BETWEEN -125 AND -115) OR
        -- Great Lakes
        (lat BETWEEN 41 AND 49 AND lng BETWEEN -95 AND -75)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get building code for jurisdiction
CREATE OR REPLACE FUNCTION public.get_building_code_for_location(
    p_state TEXT,
    p_county TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL
)
RETURNS TABLE (
    building_code TEXT,
    asce_edition TEXT,
    special_requirements JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bcm.current_building_code,
        bcm.asce_edition,
        bcm.special_requirements
    FROM public.building_code_mappings bcm
    WHERE bcm.state = p_state
    AND (p_county IS NULL OR bcm.county = p_county OR bcm.county IS NULL)
    AND (p_city IS NULL OR bcm.city = p_city OR bcm.city IS NULL)
    AND bcm.effective_date <= CURRENT_DATE
    AND (bcm.expiration_date IS NULL OR bcm.expiration_date > CURRENT_DATE)
    ORDER BY 
        CASE WHEN bcm.city = p_city THEN 1 ELSE 2 END,
        CASE WHEN bcm.county = p_county THEN 1 ELSE 2 END,
        bcm.effective_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 12. API Integration Helper Functions

-- Function to cache geocoding results
CREATE OR REPLACE FUNCTION public.cache_geocoding_result(
    p_address TEXT,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_formatted_address TEXT
)
RETURNS VOID AS $$
INSERT INTO public.geocoding_cache (address_input, coordinates, formatted_address, cached_at)
VALUES (p_address, ST_Point(p_longitude, p_latitude), p_formatted_address, NOW())
ON CONFLICT (address_input) 
DO UPDATE SET 
    coordinates = EXCLUDED.coordinates,
    formatted_address = EXCLUDED.formatted_address,
    cached_at = NOW();
$$ LANGUAGE sql;

-- Create geocoding cache table
CREATE TABLE IF NOT EXISTS public.geocoding_cache (
    id SERIAL PRIMARY KEY,
    address_input TEXT UNIQUE NOT NULL,
    coordinates POINT NOT NULL,
    formatted_address TEXT,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_geocoding_cache_address ON public.geocoding_cache(address_input);
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_expires ON public.geocoding_cache(expires_at);

-- Cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.geocoding_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM public.calculation_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 13. Data validation and quality functions

CREATE OR REPLACE FUNCTION public.validate_wind_calculation_input(
    p_wind_speed INTEGER,
    p_exposure_category TEXT,
    p_kzt_factor NUMERIC DEFAULT 1.0,
    p_building_height NUMERIC DEFAULT 30
)
RETURNS TABLE (
    is_valid BOOLEAN,
    validation_errors TEXT[]
) AS $$
DECLARE
    errors TEXT[] := '{}';
BEGIN
    -- Validate wind speed
    IF p_wind_speed < 85 OR p_wind_speed > 250 THEN
        errors := array_append(errors, 'Wind speed must be between 85 and 250 mph');
    END IF;
    
    -- Validate exposure category
    IF p_exposure_category NOT IN ('B', 'C', 'D') THEN
        errors := array_append(errors, 'Exposure category must be B, C, or D');
    END IF;
    
    -- Validate topographic factor
    IF p_kzt_factor < 1.0 OR p_kzt_factor > 3.0 THEN
        errors := array_append(errors, 'Topographic factor must be between 1.0 and 3.0');
    END IF;
    
    -- Validate building height
    IF p_building_height <= 0 OR p_building_height > 500 THEN
        errors := array_append(errors, 'Building height must be between 0 and 500 feet');
    END IF;
    
    RETURN QUERY SELECT (array_length(errors, 1) IS NULL), errors;
END;
$$ LANGUAGE plpgsql;
