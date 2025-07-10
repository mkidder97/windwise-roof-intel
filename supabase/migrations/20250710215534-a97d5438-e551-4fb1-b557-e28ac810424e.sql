-- Insert sample change detection data for testing
INSERT INTO public.change_detection_log (
  monitoring_id, 
  change_type, 
  change_data, 
  previous_data, 
  detection_confidence, 
  page_url, 
  change_summary, 
  review_status
) VALUES
-- Get monitoring IDs for GAF and Firestone
((SELECT id FROM public.manufacturer_monitoring WHERE manufacturer_name = 'GAF' LIMIT 1), 
  'spec_change', 
  '{"product_name": "EverGuard TPO System", "field": "wind_rating", "new_value": "165 psf", "old_value": "150 psf"}',
  '{"wind_rating": "150 psf", "membrane_type": "TPO"}',
  0.95,
  'https://www.gaf.com/en-us/roofing-products/commercial-roofing/tpo-roofing-systems',
  'Wind rating increased from 150 psf to 165 psf for EverGuard TPO System',
  'pending'
),

((SELECT id FROM public.manufacturer_monitoring WHERE manufacturer_name = 'GAF' LIMIT 1),
  'new_product',
  '{"product_name": "StormGuard Pro TPO", "wind_rating": "200 psf", "membrane_type": "TPO", "deck_types": ["Steel", "Concrete"]}',
  null,
  0.88,
  'https://www.gaf.com/en-us/roofing-products/commercial-roofing/new-products',
  'New product detected: StormGuard Pro TPO with 200 psf wind rating',
  'pending'
),

((SELECT id FROM public.manufacturer_monitoring WHERE manufacturer_name = 'Firestone' LIMIT 1),
  'approval_update',
  '{"product_name": "UltraPly TPO", "approval_number": "FL-2024-001", "state": "FL", "expiration_date": "2027-12-31"}',
  '{"approval_number": "FL-2023-001", "expiration_date": "2026-12-31"}',
  0.92,
  'https://www.firestonebpe.com/products/ultraply-tpo/approvals',
  'Florida approval updated with new number and extended expiration',
  'pending'
),

((SELECT id FROM public.manufacturer_monitoring WHERE manufacturer_name = 'Firestone' LIMIT 1),
  'spec_change',
  '{"product_name": "RubberGard EPDM", "field": "thickness_options", "new_value": "45, 60, 90 mil", "old_value": "45, 60 mil"}',
  '{"thickness_options": "45, 60 mil"}',
  0.85,
  'https://www.firestonebpe.com/products/rubbergard-epdm/specifications',
  'New 90 mil thickness option added to RubberGard EPDM product line',
  'pending'
);