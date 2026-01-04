-- Create sale_items table
CREATE TABLE public.sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales_transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Policies for sale_items
-- Users can view sale items if they can view the parent sale transaction
CREATE POLICY "Users can view sale items if they can view parent sale" ON public.sale_items
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sales_transactions WHERE sales_transactions.id = sale_items.sale_id AND ((sales_transactions.profile_id = auth.uid()) OR public.is_admin_or_super_admin())));

-- Users can insert sale items if they can insert the parent sale transaction
CREATE POLICY "Users can insert sale items if they can insert parent sale" ON public.sale_items
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.sales_transactions WHERE sales_transactions.id = sale_items.sale_id AND ((sales_transactions.profile_id = auth.uid()) OR public.is_admin_or_super_admin())));

-- Users can update sale items if they can update the parent sale transaction
CREATE POLICY "Users can update sale items if they can update parent sale" ON public.sale_items
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.sales_transactions WHERE sales_transactions.id = sale_items.sale_id AND ((sales_transactions.profile_id = auth.uid()) OR public.is_admin_or_super_admin())))
WITH CHECK (EXISTS (SELECT 1 FROM public.sales_transactions WHERE sales_transactions.id = sale_items.sale_id AND ((sales_transactions.profile_id = auth.uid()) OR public.is_admin_or_super_admin())));

-- Users can delete sale items if they can delete the parent sale transaction
CREATE POLICY "Users can delete sale items if they can delete parent sale" ON public.sale_items
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.sales_transactions WHERE sales_transactions.id = sale_items.sale_id AND ((sales_transactions.profile_id = auth.uid()) OR public.is_admin_or_super_admin())));