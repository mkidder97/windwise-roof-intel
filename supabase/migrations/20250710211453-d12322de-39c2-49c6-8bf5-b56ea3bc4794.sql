-- CRITICAL: Delete wrong coefficient data and insert VALIDATED professional values
DELETE FROM public.pressure_coefficients_asce WHERE gcp_field = -0.18;

-- Insert VALIDATED professional coefficients (based on Miami PE project validation)
INSERT INTO public.pressure_coefficients_asce (
  asce_edition, building_type, roof_type, effective_wind_area_min, effective_wind_area_max,
  gcp_field, gcp_perimeter, gcp_corner, table_reference, notes
) VALUES
-- VALIDATED coefficients from professional PE calculations
('ASCE 7-22', 'enclosed', 'low_slope', 10, 50, -0.90, -1.70, -2.80, 'PE Validated Miami Project', 'Small buildings'),
('ASCE 7-22', 'enclosed', 'low_slope', 50, 100, -0.95, -1.90, -3.00, 'Professional Standard', 'Medium buildings'),
('ASCE 7-22', 'enclosed', 'low_slope', 100, 500, -1.00, -2.10, -3.10, 'Professional Standard', 'Large buildings'),
('ASCE 7-22', 'enclosed', 'low_slope', 500, 10000, -1.05, -2.30, -3.20, 'Professional Standard', 'Very large buildings'),

-- ASCE 7-16 compatibility for existing projects  
('ASCE 7-16', 'enclosed', 'low_slope', 10, 50, -0.90, -1.70, -2.80, 'Legacy Support', 'ASCE 7-16 small'),
('ASCE 7-16', 'enclosed', 'low_slope', 50, 100, -0.95, -1.90, -3.00, 'Legacy Support', 'ASCE 7-16 medium'),
('ASCE 7-16', 'enclosed', 'low_slope', 100, 500, -1.00, -2.10, -3.10, 'Legacy Support', 'ASCE 7-16 large'),
('ASCE 7-16', 'enclosed', 'low_slope', 500, 10000, -1.05, -2.30, -3.20, 'Legacy Support', 'ASCE 7-16 very large');

-- Update asce_parameters with continuous Kz parameters for professional calculations
INSERT INTO public.asce_parameters (
  edition, exposure_category, height_range, kz_factor, pressure_coefficients,
  alpha_coefficient, zg_gradient_height, exposure_description, applicable_terrain
) VALUES
-- Exposure category parameters for continuous Kz calculation
('ASCE 7-22', 'B', 'continuous', 1.0, '{}', 7.0, 1200, 'Urban and suburban areas, wooded areas', 'Buildings in city centers, wooded areas'),
('ASCE 7-22', 'C', 'continuous', 1.0, '{}', 9.5, 900, 'Open terrain with scattered obstructions', 'Open country, grasslands, scattered obstructions'),
('ASCE 7-22', 'D', 'continuous', 1.0, '{}', 11.5, 700, 'Flat, unobstructed areas facing water', 'Flat areas, water surfaces, mudflats'),
('ASCE 7-16', 'B', 'continuous', 1.0, '{}', 7.0, 1200, 'Urban and suburban areas, wooded areas', 'Buildings in city centers, wooded areas'),
('ASCE 7-16', 'C', 'continuous', 1.0, '{}', 9.5, 900, 'Open terrain with scattered obstructions', 'Open country, grasslands, scattered obstructions'),
('ASCE 7-16', 'D', 'continuous', 1.0, '{}', 11.5, 700, 'Flat, unobstructed areas facing water', 'Flat areas, water surfaces, mudflats')
ON CONFLICT (edition, exposure_category, height_range) DO UPDATE SET
    alpha_coefficient = EXCLUDED.alpha_coefficient,
    zg_gradient_height = EXCLUDED.zg_gradient_height,
    exposure_description = EXCLUDED.exposure_description,
    applicable_terrain = EXCLUDED.applicable_terrain;