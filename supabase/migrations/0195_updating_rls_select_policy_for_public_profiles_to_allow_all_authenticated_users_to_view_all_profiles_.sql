DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "Allow authenticated users to view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (true);