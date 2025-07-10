-- Create storage bucket for CAD files
INSERT INTO storage.buckets (id, name, public) VALUES ('cad-files', 'cad-files', false);

-- Create storage policies for CAD file uploads
CREATE POLICY "Users can view their own CAD files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cad-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own CAD files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'cad-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own CAD files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'cad-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own CAD files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'cad-files' AND auth.uid()::text = (storage.foldername(name))[1]);