-- Drop existing policies that use user_id
DROP POLICY IF EXISTS "Users can only view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Allow project creators to insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Allow project creators to update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Allow project creators to delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "updating_rls_policy_for_projects_select_own_projects_to_use_scalar_subquery_for_auth_uid_" ON public.projects;
DROP POLICY IF EXISTS "updating_rls_policy_for_projects_insert_to_use_scalar_subquery_for_auth_uid_" ON public.projects;
DROP POLICY IF EXISTS "updating_rls_policy_for_projects_update_to_use_scalar_subquery_for_auth_uid_" ON public.projects;
DROP POLICY IF EXISTS "updating_rls_policy_for_projects_delete_to_use_scalar_subquery_for_auth_uid_" ON public.projects;

-- Recreate policies using profile_id
CREATE POLICY "Users can only view their own projects" ON public.projects
FOR SELECT TO authenticated USING (profile_id = (SELECT auth.uid()));

CREATE POLICY "Allow project creators to insert their own projects" ON public.projects
FOR INSERT TO authenticated WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "Allow project creators to update their own projects" ON public.projects
FOR UPDATE TO authenticated USING (profile_id = (SELECT auth.uid()));

CREATE POLICY "Allow project creators to delete their own projects" ON public.projects
FOR DELETE TO authenticated USING (profile_id = (SELECT auth.uid()));