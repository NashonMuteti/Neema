-- Create the 'project-thumbnails' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-thumbnails', 'project-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to view project thumbnails
CREATE POLICY "Allow authenticated users to view project thumbnails"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-thumbnails');

-- Policy: Allow project creators to manage their own thumbnails (insert, update, delete)
CREATE POLICY "Allow project creators to manage their own thumbnails"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'project-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text
) WITH CHECK (
  bucket_id = 'project-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text
);