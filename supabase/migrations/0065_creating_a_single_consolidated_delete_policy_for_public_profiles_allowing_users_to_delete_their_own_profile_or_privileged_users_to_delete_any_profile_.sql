CREATE POLICY "Consolidated delete policy for profiles" ON public.profiles FOR DELETE TO authenticated USING (
  (id = (SELECT auth.uid())) OR
  (EXISTS ( SELECT 1 FROM profiles profiles_1 WHERE ((profiles_1.id = (SELECT auth.uid())) AND (profiles_1.role = ANY (ARRAY['Admin'::text, 'Super Admin'::text])))))
);