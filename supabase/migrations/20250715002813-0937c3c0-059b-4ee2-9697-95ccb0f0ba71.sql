-- Add new cities to wind_speeds table (only new cities, avoiding duplicates)

-- Texas cities (new additions)
INSERT INTO public.wind_speeds (city, state, wind_speed, asce_edition, risk_category) VALUES
('Irving', 'TX', 130, 'ASCE 7-22', 'II'),
('Garland', 'TX', 130, 'ASCE 7-22', 'II'),
('Grand Prairie', 'TX', 130, 'ASCE 7-22', 'II'),
('Lubbock', 'TX', 125, 'ASCE 7-22', 'II'),
('Beaumont', 'TX', 145, 'ASCE 7-22', 'II'),
('Port Arthur', 'TX', 150, 'ASCE 7-22', 'II'),
('Laredo', 'TX', 125, 'ASCE 7-22', 'II'),
('Tyler', 'TX', 125, 'ASCE 7-22', 'II'),
('Waco', 'TX', 125, 'ASCE 7-22', 'II'),
('Amarillo', 'TX', 120, 'ASCE 7-22', 'II');

-- Florida cities (new additions)
INSERT INTO public.wind_speeds (city, state, wind_speed, asce_edition, risk_category) VALUES
('West Palm Beach', 'FL', 165, 'ASCE 7-22', 'II'),
('Pensacola', 'FL', 155, 'ASCE 7-22', 'II'),
('Gainesville', 'FL', 145, 'ASCE 7-22', 'II'),
('Ocala', 'FL', 140, 'ASCE 7-22', 'II'),
('Lakeland', 'FL', 150, 'ASCE 7-22', 'II'),
('Cape Coral', 'FL', 165, 'ASCE 7-22', 'II'),
('Port St. Lucie', 'FL', 160, 'ASCE 7-22', 'II'),
('Daytona Beach', 'FL', 155, 'ASCE 7-22', 'II');

-- California cities (new additions)
INSERT INTO public.wind_speeds (city, state, wind_speed, asce_edition, risk_category) VALUES
('San Jose', 'CA', 105, 'ASCE 7-22', 'II'),
('Anaheim', 'CA', 110, 'ASCE 7-22', 'II'),
('Stockton', 'CA', 105, 'ASCE 7-22', 'II'),
('Riverside', 'CA', 105, 'ASCE 7-22', 'II'),
('Santa Ana', 'CA', 110, 'ASCE 7-22', 'II');

-- Georgia cities (new additions)
INSERT INTO public.wind_speeds (city, state, wind_speed, asce_edition, risk_category) VALUES
('Macon', 'GA', 115, 'ASCE 7-22', 'II'),
('Athens', 'GA', 115, 'ASCE 7-22', 'II'),
('Albany', 'GA', 120, 'ASCE 7-22', 'II'),
('Warner Robins', 'GA', 115, 'ASCE 7-22', 'II'),
('Roswell', 'GA', 120, 'ASCE 7-22', 'II'),
('Sandy Springs', 'GA', 120, 'ASCE 7-22', 'II'),
('Valdosta', 'GA', 125, 'ASCE 7-22', 'II');

-- Arizona cities (new additions)  
INSERT INTO public.wind_speeds (city, state, wind_speed, asce_edition, risk_category) VALUES
('Chandler', 'AZ', 95, 'ASCE 7-22', 'II'),
('Glendale', 'AZ', 95, 'ASCE 7-22', 'II'),
('Tempe', 'AZ', 95, 'ASCE 7-22', 'II'),
('Peoria', 'AZ', 95, 'ASCE 7-22', 'II'),
('Surprise', 'AZ', 95, 'ASCE 7-22', 'II'),
('Yuma', 'AZ', 100, 'ASCE 7-22', 'II'),
('Flagstaff', 'AZ', 105, 'ASCE 7-22', 'II');

-- Add engineer verification columns to calculations table
ALTER TABLE public.calculations ADD COLUMN IF NOT EXISTS
engineer_verified BOOLEAN DEFAULT false,
engineer_name TEXT,
engineer_license TEXT,
engineer_state TEXT,
verification_date TIMESTAMP WITH TIME ZONE;