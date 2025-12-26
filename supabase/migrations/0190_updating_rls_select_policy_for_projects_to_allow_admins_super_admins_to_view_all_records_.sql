-- Drop the existing SELECT policy for projects
DROP POLICY IF EXISTS "Users can only view their own projects" ON public.projects;

-- Recreate the SELECT policy to allow users to view their own projects OR admins/super admins to view all
CREATE POLICY "Allow authenticated users to view their own projects or all for admins"
ON public.projects FOR SELECT TO authenticated
USING (
  (profile_id = auth.uid()) OR public.is_admin_or_super_admin()
);