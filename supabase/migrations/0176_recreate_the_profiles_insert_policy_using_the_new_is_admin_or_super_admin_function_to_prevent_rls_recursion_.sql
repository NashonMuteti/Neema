CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = id) OR public.is_admin_or_super_admin()
);