-- Create the 'avatars' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to view avatars
CREATE POLICY "Allow authenticated users to view avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

-- Policy: Allow admins to manage all avatars (insert, update, delete)
CREATE POLICY "Allow admins to manage all avatars"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'avatars' AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Super Admin')
  )
) WITH CHECK (
  bucket_id = 'avatars' AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Super Admin')
  )
);