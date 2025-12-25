-- Create the 'board-members' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('board-members', 'board-members', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to view board member images
CREATE POLICY "Allow authenticated users to view board member images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'board-members');

-- Policy: Allow admins to manage board member images (insert, update, delete)
CREATE POLICY "Allow admins to manage board member images"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'board-members' AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Super Admin')
  )
) WITH CHECK (
  bucket_id = 'board-members' AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Super Admin')
  )
);