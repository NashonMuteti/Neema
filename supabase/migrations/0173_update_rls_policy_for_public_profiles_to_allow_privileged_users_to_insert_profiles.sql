-- Drop the existing profiles_insert_policy
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- Recreate the profiles_insert_policy to allow privileged users to insert profiles
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = id) OR
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Super Admin')
  ))
);