-- Create manufacturer monitoring and automation tables

-- Manufacturer monitoring configurations
CREATE TABLE IF NOT EXISTS public.manufacturer_monitoring (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    manufacturer_name TEXT NOT NULL,
    website_url TEXT NOT NULL,
    monitoring_config JSONB NOT NULL DEFAULT '{"product_pages": [], "spec_selectors": {}, "check_frequency": "weekly", "notification_enabled": true}'::jsonb,
    notification_settings JSONB NOT NULL DEFAULT '{"alert_types": ["new_products", "spec_changes", "approval_updates"], "email_enabled": true, "slack_enabled": false, "email_recipients": []}'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
    last_checked TIMESTAMP WITH TIME ZONE,
    last_change_detected TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Change detection log for tracking all detected changes
CREATE TABLE IF NOT EXISTS public.change_detection_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    monitoring_id UUID REFERENCES public.manufacturer_monitoring(id),
    page_url TEXT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('new_product', 'spec_change', 'approval_update', 'price_change', 'contact_info', 'description_change')),
    change_data JSONB NOT NULL,
    previous_data JSONB,
    change_summary TEXT,
    detection_confidence NUMERIC DEFAULT 0.8 CHECK (detection_confidence BETWEEN 0 AND 1),
    auto_approved BOOLEAN DEFAULT false,
    review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'ignored')),
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notification history for audit trail
CREATE TABLE IF NOT EXISTS public.notification_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    change_id UUID REFERENCES public.change_detection_log(id),
    notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'dashboard', 'slack', 'sms')),
    recipient TEXT NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System metrics for monitoring
CREATE TABLE IF NOT EXISTS public.system_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT,
    metric_tags JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User activity log for compliance and analytics
CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.manufacturer_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_detection_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for manufacturer monitoring (engineers and admins only)
CREATE POLICY "Engineers can manage manufacturer monitoring" ON public.manufacturer_monitoring
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('engineer', 'admin')
        )
    );

-- RLS policies for change detection log (engineers and admins can view/manage)
CREATE POLICY "Engineers can view change detection logs" ON public.change_detection_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('engineer', 'admin')
        )
    );

-- RLS policies for notification history (engineers can view)
CREATE POLICY "Engineers can view notification history" ON public.notification_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('engineer', 'admin')
        )
    );

-- RLS policies for system metrics (engineers can view)
CREATE POLICY "Engineers can view system metrics" ON public.system_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('engineer', 'admin')
        )
    );

-- RLS policies for user activity log
CREATE POLICY "Engineers can view all activity" ON public.user_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('engineer', 'admin')
        )
    );

CREATE POLICY "Users can view their own activity" ON public.user_activity_log
    FOR SELECT USING (auth.uid() = user_id);

-- Insert initial monitoring configurations for top manufacturers
INSERT INTO public.manufacturer_monitoring (manufacturer_name, website_url, monitoring_config, notification_settings) VALUES
('GAF', 'https://www.gaf.com', '{"product_pages": ["/roofing/commercial"], "spec_selectors": {"product_name": "h1, .product-title", "wind_rating": ".wind-rating, .specifications"}, "check_frequency": "weekly", "notification_enabled": true}', '{"alert_types": ["new_products", "spec_changes", "approval_updates"], "email_enabled": true, "email_recipients": ["engineering@company.com"]}'),
('Firestone', 'https://www.firestonebpco.com', '{"product_pages": ["/products/roofing"], "spec_selectors": {"product_name": "h1, .product-title", "wind_rating": ".specifications, .tech-data"}, "check_frequency": "weekly", "notification_enabled": true}', '{"alert_types": ["new_products", "spec_changes", "approval_updates"], "email_enabled": true, "email_recipients": ["engineering@company.com"]}'),
('Carlisle', 'https://www.carlislesyntec.com', '{"product_pages": ["/products"], "spec_selectors": {"product_name": "h1, .product-title", "wind_rating": ".product-specs, .technical-data"}, "check_frequency": "weekly", "notification_enabled": true}', '{"alert_types": ["new_products", "spec_changes", "approval_updates"], "email_enabled": true, "email_recipients": ["engineering@company.com"]}');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manufacturer_monitoring_status ON public.manufacturer_monitoring(status);
CREATE INDEX IF NOT EXISTS idx_change_detection_log_review_status ON public.change_detection_log(review_status);
CREATE INDEX IF NOT EXISTS idx_change_detection_log_created_at ON public.change_detection_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON public.user_activity_log(created_at);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_manufacturer_monitoring_updated_at
    BEFORE UPDATE ON public.manufacturer_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();