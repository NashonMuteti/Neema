DROP POLICY IF EXISTS "Allow authenticated users to view project collections" ON public.project_collections;
CREATE POLICY "Users can only view their own project collections" ON public.project_collections
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_collections.project_id AND user_id = auth.uid()));