DROP POLICY IF EXISTS "Allow project creators to delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Allow project creators to insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Allow project creators to update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can only view their own projects" ON public.projects;

CREATE POLICY "Allow project creators to delete their own projects" ON public.projects FOR DELETE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Allow project creators to insert their own projects" ON public.projects FOR INSERT TO authenticated WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Allow project creators to update their own projects" ON public.projects FOR UPDATE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can only view their own projects" ON public.projects FOR SELECT TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));