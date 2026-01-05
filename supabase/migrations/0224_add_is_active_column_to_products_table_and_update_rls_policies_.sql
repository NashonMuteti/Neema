-- Add is_active column to products table
ALTER TABLE public.products
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Update RLS policies for products table to include is_active
-- Policy: Admins can manage all products
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
CREATE POLICY "Admins can manage all products" ON public.products
FOR ALL TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());

-- Policy: Project Managers can manage their own products
DROP POLICY IF EXISTS "Project Managers can manage their own products" ON public.products;
CREATE POLICY "Project Managers can manage their own products" ON public.products
FOR ALL TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Policy: Authenticated users can view active products
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
CREATE POLICY "Authenticated users can view products" ON public.products
FOR SELECT TO authenticated
USING (is_active = TRUE OR is_admin_or_super_admin() OR auth.uid() = profile_id);