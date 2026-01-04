-- Create products table
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  price NUMERIC DEFAULT 0 NOT NULL CHECK (price >= 0),
  current_stock NUMERIC DEFAULT 0 NOT NULL CHECK (current_stock >= 0),
  reorder_point NUMERIC DEFAULT 0 NOT NULL CHECK (reorder_point >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policies for products
-- Authenticated users can view products (public read for now, can be restricted later)
CREATE POLICY "Authenticated users can view products" ON public.products
FOR SELECT TO authenticated
USING (true);

-- Admins/Super Admins can manage all products
CREATE POLICY "Admins can manage all products" ON public.products
FOR ALL TO authenticated
USING (public.is_admin_or_super_admin())
WITH CHECK (public.is_admin_or_super_admin());

-- Project Managers can manage products they own
CREATE POLICY "Project Managers can manage their own products" ON public.products
FOR ALL TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);