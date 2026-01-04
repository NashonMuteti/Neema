-- Create sales_transactions table
CREATE TABLE public.sales_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Salesperson/creator of the sale
  customer_name TEXT, -- Optional customer name
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL, -- e.g., 'cash', 'card', 'mobile-money'
  received_into_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT, -- Account where money is received
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for sales_transactions
-- Authenticated users can view their own sales or admins can view all
CREATE POLICY "Users can view their own sales or admins can view all" ON public.sales_transactions
FOR SELECT TO authenticated
USING (
  (auth.uid() = profile_id) OR public.is_admin_or_super_admin()
);

-- Authenticated users can insert their own sales or admins can insert for others
CREATE POLICY "Users can insert their own sales or admins can insert all" ON public.sales_transactions
FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = profile_id) OR public.is_admin_or_super_admin()
);

-- Authenticated users can update their own sales or admins can update all
CREATE POLICY "Users can update their own sales or admins can update all" ON public.sales_transactions
FOR UPDATE TO authenticated
USING (
  (auth.uid() = profile_id) OR public.is_admin_or_super_admin()
)
WITH CHECK (
  (auth.uid() = profile_id) OR public.is_admin_or_super_admin()
);

-- Authenticated users can delete their own sales or admins can delete all
CREATE POLICY "Users can delete their own sales or admins can delete all" ON public.sales_transactions
FOR DELETE TO authenticated
USING (
  (auth.uid() = profile_id) OR public.is_admin_or_super_admin()
);