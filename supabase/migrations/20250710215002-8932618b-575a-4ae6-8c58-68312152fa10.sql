-- Create manufacturer_monitoring table
CREATE TABLE public.manufacturer_monitoring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  monitoring_config JSONB NOT NULL DEFAULT '{
    "product_pages": [],
    "spec_selectors": {},
    "check_frequency": "weekly",
    "notification_enabled": true
  }'::jsonb,
  notification_settings JSONB NOT NULL DEFAULT '{
    "email_enabled": true,
    "slack_enabled": false,
    "email_recipients": [],
    "alert_types": ["new_products", "spec_changes", "approval_updates"]
  }'::jsonb,
  last_checked TIMESTAMP WITH TIME ZONE,
  last_change_detected TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create change_detection_log table
CREATE TABLE public.change_detection_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitoring_id UUID REFERENCES public.manufacturer_monitoring(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- 'new_product', 'spec_change', 'approval_update', 'page_structure_change'
  change_data JSONB NOT NULL, -- stores the detected changes
  previous_data JSONB, -- stores the previous state for comparison
  detection_confidence NUMERIC DEFAULT 0.8, -- 0-1 confidence score
  page_url TEXT NOT NULL,
  change_summary TEXT,
  review_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'auto_approved'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  auto_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notification_history table for tracking sent alerts
CREATE TABLE public.notification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  change_id UUID REFERENCES public.change_detection_log(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'email', 'slack'
  recipient TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.manufacturer_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_detection_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Engineers can manage manufacturer monitoring"
ON public.manufacturer_monitoring
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('engineer', 'admin')
  )
);

CREATE POLICY "Engineers can view change detection logs"
ON public.change_detection_log
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('engineer', 'admin')
  )
);

CREATE POLICY "Engineers can view notification history"
ON public.notification_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('engineer', 'admin')
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_manufacturer_monitoring_updated_at
BEFORE UPDATE ON public.manufacturer_monitoring
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample monitoring configurations
INSERT INTO public.manufacturer_monitoring (manufacturer_name, website_url, monitoring_config, notification_settings) VALUES
('GAF', 'https://www.gaf.com', '{
  "product_pages": [
    "https://www.gaf.com/en-us/roofing-products/commercial-roofing/tpo-roofing-systems",
    "https://www.gaf.com/en-us/roofing-products/commercial-roofing/epdm-roofing-systems"
  ],
  "spec_selectors": {
    "product_name": ".product-title, h1",
    "wind_rating": ".wind-rating, .specifications .wind",
    "approval_number": ".approval-number, .certifications"
  },
  "check_frequency": "weekly",
  "notification_enabled": true
}', '{
  "email_enabled": true,
  "slack_enabled": false,
  "email_recipients": ["engineer@company.com"],
  "alert_types": ["new_products", "spec_changes", "approval_updates"]
}'),
('Firestone', 'https://www.firestonebpe.com', '{
  "product_pages": [
    "https://www.firestonebpe.com/products/ultraply-tpo",
    "https://www.firestonebpe.com/products/rubbergard-epdm"
  ],
  "spec_selectors": {
    "product_name": ".hero-title, h1",
    "wind_rating": ".wind-uplift, .performance-data",
    "approval_number": ".approvals, .compliance"
  },
  "check_frequency": "weekly",
  "notification_enabled": true
}', '{
  "email_enabled": true,
  "slack_enabled": false,
  "email_recipients": ["engineer@company.com"],
  "alert_types": ["new_products", "spec_changes"]
}');