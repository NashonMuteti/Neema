DROP POLICY IF EXISTS "Allow authenticated users to view projects" ON public.projects;
CREATE POLICY "Users can only view their own projects" ON public.projects
FOR SELECT TO authenticated USING (auth.uid() = user_id);