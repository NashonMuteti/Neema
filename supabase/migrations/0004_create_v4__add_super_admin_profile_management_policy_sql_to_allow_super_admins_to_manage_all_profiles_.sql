-- V4__add_super_admin_profile_management_policy.sql

CREATE POLICY "Super Admins can manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin'));