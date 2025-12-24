-- Policies for Admin and Super Admin to manage ALL profiles
-- These policies will be combined with existing user-specific policies using OR.

-- Allow Admins and Super Admins to view all profiles
CREATE POLICY "Admins and Super Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

-- Allow Admins and Super Admins to insert profiles
CREATE POLICY "Admins and Super Admins can insert profiles" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

-- Allow Admins and Super Admins to update profiles
CREATE POLICY "Admins and Super Admins can update profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));

-- Allow Admins and Super Admins to delete profiles
CREATE POLICY "Admins and Super Admins can delete profiles" ON public.profiles
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin')));