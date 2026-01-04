-- Create stock_movements table
CREATE TABLE public.stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  quantity NUMERIC DEFAULT 0 NOT NULL CHECK (quantity > 0),
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies for stock_movements
-- Authenticated users can view stock movements related to products they can view
CREATE POLICY "Authenticated users can view stock movements" ON public.stock_movements
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.products WHERE products.id = stock_movements.product_id));

-- Admins/Super Admins can manage all stock movements
CREATE POLICY "Admins can manage all stock movements" ON public.stock_movements
FOR ALL TO authenticated
USING (public.is_admin_or_super_admin())
WITH CHECK (public.is_admin_or_super_admin());

-- Project Managers can manage stock movements for products they own
CREATE POLICY "Project Managers can manage stock movements for their products" ON public.stock_movements
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.products WHERE products.id = stock_movements.product_id AND products.profile_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.products WHERE products.id = stock_movements.product_id AND products.profile_id = auth.uid()));