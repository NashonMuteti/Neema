-- Drop the existing profiles_select_policy
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Recreate the profiles_select_policy to allow users to view their own profile OR if they are an Admin/Super Admin
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (
  (auth.uid() = id) OR public.is_admin_or_super_admin()
);