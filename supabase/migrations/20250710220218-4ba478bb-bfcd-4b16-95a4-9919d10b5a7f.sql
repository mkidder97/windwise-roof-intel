-- Performance improvements: Add database indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_roof_systems_manufacturer ON public.roof_systems(manufacturer);
CREATE INDEX IF NOT EXISTS idx_roof_systems_membrane_type ON public.roof_systems(membrane_type);
CREATE INDEX IF NOT EXISTS idx_roof_systems_max_wind_pressure ON public.roof_systems(max_wind_pressure);
CREATE INDEX IF NOT EXISTS idx_roof_systems_deck_types ON public.roof_systems USING GIN(deck_types);

CREATE INDEX IF NOT EXISTS idx_state_approvals_state ON public.state_approvals(state);
CREATE INDEX IF NOT EXISTS idx_state_approvals_system_id ON public.state_approvals(system_id);
CREATE INDEX IF NOT EXISTS idx_state_approvals_status ON public.state_approvals(status);
CREATE INDEX IF NOT EXISTS idx_state_approvals_expiration_date ON public.state_approvals(expiration_date);

CREATE INDEX IF NOT EXISTS idx_manufacturer_monitoring_status ON public.manufacturer_monitoring(status);
CREATE INDEX IF NOT EXISTS idx_manufacturer_monitoring_last_checked ON public.manufacturer_monitoring(last_checked);

CREATE INDEX IF NOT EXISTS idx_change_detection_log_monitoring_id ON public.change_detection_log(monitoring_id);
CREATE INDEX IF NOT EXISTS idx_change_detection_log_review_status ON public.change_detection_log(review_status);
CREATE INDEX IF NOT EXISTS idx_change_detection_log_created_at ON public.change_detection_log(created_at);

-- Add full-text search capabilities
CREATE INDEX IF NOT EXISTS idx_roof_systems_search ON public.roof_systems USING GIN(to_tsvector('english', system_name || ' ' || manufacturer || ' ' || COALESCE(description, '')));

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_roof_systems_manufacturer_membrane ON public.roof_systems(manufacturer, membrane_type);
CREATE INDEX IF NOT EXISTS idx_roof_systems_pressure_range ON public.roof_systems(max_wind_pressure) WHERE max_wind_pressure IS NOT NULL;

-- Monitoring and performance tracking table
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  metric_tags JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON public.system_metrics(metric_name, recorded_at);

-- User activity tracking for audit trails
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON public.user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity_log(created_at);

-- Enable RLS on new tables
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for system metrics (engineers only)
CREATE POLICY "Engineers can view system metrics"
ON public.system_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('engineer', 'admin')
  )
);

-- RLS policies for user activity log
CREATE POLICY "Users can view their own activity"
ON public.user_activity_log
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Engineers can view all activity"
ON public.user_activity_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('engineer', 'admin')
  )
);