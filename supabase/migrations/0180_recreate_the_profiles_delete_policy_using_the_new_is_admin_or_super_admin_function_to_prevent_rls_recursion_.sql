CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE TO authenticated
USING (
  (auth.uid() = id) OR public.is_admin_or_super_admin()
);