-- Template management system
CREATE TABLE IF NOT EXISTS geometry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  geometry_data JSONB NOT NULL,
  thumbnail_url TEXT,
  building_type TEXT,
  typical_use_cases TEXT[],
  user_id UUID REFERENCES auth.users(id),
  is_shared BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for templates
ALTER TABLE geometry_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates and shared templates
CREATE POLICY "Users can view accessible templates" ON geometry_templates
  FOR SELECT USING (
    user_id = auth.uid() OR is_shared = true
  );

-- Users can create their own templates
CREATE POLICY "Users can create templates" ON geometry_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own templates
CREATE POLICY "Users can update own templates" ON geometry_templates
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates" ON geometry_templates
  FOR DELETE USING (user_id = auth.uid());

-- Enhanced building_geometries for workflow tracking
ALTER TABLE building_geometries ADD COLUMN IF NOT EXISTS
  extraction_confidence INTEGER DEFAULT 0;

ALTER TABLE building_geometries ADD COLUMN IF NOT EXISTS
  manual_overrides JSONB DEFAULT '{}';

ALTER TABLE building_geometries ADD COLUMN IF NOT EXISTS
  review_status TEXT DEFAULT 'pending';

ALTER TABLE building_geometries ADD COLUMN IF NOT EXISTS
  approved_by UUID REFERENCES auth.users(id);

ALTER TABLE building_geometries ADD COLUMN IF NOT EXISTS
  approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE building_geometries ADD COLUMN IF NOT EXISTS
  template_source UUID REFERENCES geometry_templates(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_geometry_templates_user_shared 
  ON geometry_templates(user_id, is_shared);

CREATE INDEX IF NOT EXISTS idx_geometry_templates_building_type 
  ON geometry_templates(building_type);

-- Add trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_geometry_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_geometry_templates_updated_at
    BEFORE UPDATE ON geometry_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_geometry_templates_updated_at();