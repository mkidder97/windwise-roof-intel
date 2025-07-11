-- Update storage bucket settings for CAD files
UPDATE storage.buckets 
SET public = true 
WHERE id = 'cad-files';

-- Drop existing policies to recreate them with new requirements
DROP POLICY IF EXISTS "Users can view their own CAD files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own CAD files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own CAD files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own CAD files" ON storage.objects;

-- Create comprehensive storage policies for CAD files
CREATE POLICY "Public read access for CAD files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cad-files');

CREATE POLICY "Authenticated users can upload CAD files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cad-files' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own CAD files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'cad-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Only file owners can delete CAD files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'cad-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add file cleanup function for old files (90+ days)
CREATE OR REPLACE FUNCTION public.cleanup_old_cad_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete files older than 90 days
  DELETE FROM storage.objects 
  WHERE bucket_id = 'cad-files' 
    AND created_at < NOW() - INTERVAL '90 days';
    
  -- Clean up orphaned building_geometries records
  UPDATE building_geometries 
  SET cad_file_url = NULL 
  WHERE cad_file_url IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM storage.objects 
      WHERE bucket_id = 'cad-files' 
        AND name = building_geometries.cad_file_url
    );
END;
$$;

-- Add processing status columns to building_geometries
ALTER TABLE public.building_geometries
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS processing_error TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;