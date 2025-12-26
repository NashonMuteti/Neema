-- Drop the existing SELECT policy for project_collections
DROP POLICY IF EXISTS "Users can only view their own project collections" ON public.project_collections;

-- Recreate the SELECT policy to allow users to view their own project collections OR admins/super admins to view all
CREATE POLICY "Allow authenticated users to view their own project collections or all for admins"
ON public.project_collections FOR SELECT TO authenticated
USING (
  (EXISTS ( SELECT 1 FROM projects WHERE ((projects.id = project_collections.project_id) AND (projects.profile_id = auth.uid()))))
  OR public.is_admin_or_super_admin()
);