CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated
USING (
  (auth.uid() = id) OR public.is_admin_or_super_admin()
)
WITH CHECK (
  (auth.uid() = id) OR public.is_admin_or_super_admin()
);