-- Create the 'brand-logos' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for public read access to brand logos
DROP POLICY IF EXISTS "Public read access to brand logos" ON storage.objects;
CREATE POLICY "Public read access to brand logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-logos');

-- Policy for authenticated users with Admin/Super Admin roles to insert brand logos
DROP POLICY IF EXISTS "Admins can upload brand logos" ON storage.objects;
CREATE POLICY "Admins can upload brand logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-logos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')
  )
);

-- Policy for authenticated users with Admin/Super Admin roles to update brand logos
DROP POLICY IF EXISTS "Admins can update brand logos" ON storage.objects;
CREATE POLICY "Admins can update brand logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-logos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')
  )
)
WITH CHECK (
  bucket_id = 'brand-logos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')
  )
);

-- Policy for authenticated users with Admin/Super Admin roles to delete brand logos
DROP POLICY IF EXISTS "Admins can delete brand logos" ON storage.objects;
CREATE POLICY "Admins can delete brand logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-logos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')
  )
);

-- Add RLS UPDATE policy for settings table
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
CREATE POLICY "Admins can update settings"
ON public.settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')
  )
);