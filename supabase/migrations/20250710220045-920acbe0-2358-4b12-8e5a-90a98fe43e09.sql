-- Update manufacturer monitoring configurations to include new manufacturers for testing
UPDATE public.manufacturer_monitoring 
SET monitoring_config = jsonb_set(
  monitoring_config, 
  '{product_pages}',
  '[
    "https://www.carlisle-syntec.com/products/sure-weld",
    "https://www.carlisle-syntec.com/products/fleeceback"
  ]'::jsonb
),
website_url = 'https://www.carlisle-syntec.com'
WHERE manufacturer_name = 'GAF';

-- Add Carlisle SynTec monitoring configuration
INSERT INTO public.manufacturer_monitoring (manufacturer_name, website_url, monitoring_config, notification_settings) VALUES
('Carlisle SynTec', 'https://www.carlisle-syntec.com', '{
  "product_pages": [
    "https://www.carlisle-syntec.com/products/sure-weld-tpo",
    "https://www.carlisle-syntec.com/products/fleeceback-epdm",
    "https://www.carlisle-syntec.com/products/restoTabbed"
  ],
  "spec_selectors": {
    "product_name": ".product-title, h1, .hero-title",
    "wind_rating": ".wind-uplift, .performance-specs, .technical-data",
    "approval_number": ".approvals, .certifications, .code-compliance"
  },
  "check_frequency": "weekly",
  "notification_enabled": true
}', '{
  "email_enabled": true,
  "slack_enabled": false,
  "email_recipients": ["engineer@company.com"],
  "alert_types": ["new_products", "spec_changes", "approval_updates"]
}'),

('Sika Sarnafil', 'https://www.usa.sika.com', '{
  "product_pages": [
    "https://usa.sika.com/en/construction/roofing/single-ply-membrane-systems/sarnafil.html",
    "https://usa.sika.com/en/construction/roofing/single-ply-membrane-systems/sikaplan.html"
  ],
  "spec_selectors": {
    "product_name": ".product-name, h1, .page-title",
    "wind_rating": ".wind-resistance, .technical-specs",
    "approval_number": ".certifications, .approvals"
  },
  "check_frequency": "weekly",
  "notification_enabled": true
}', '{
  "email_enabled": true,
  "slack_enabled": false,
  "email_recipients": ["engineer@company.com"],
  "alert_types": ["new_products", "spec_changes"]
}');