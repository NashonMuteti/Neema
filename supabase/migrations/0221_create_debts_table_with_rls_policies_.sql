-- Create debts table
CREATE TABLE public.debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- The user who recorded this debt
  sale_id UUID REFERENCES public.sales_transactions(id) ON DELETE SET NULL, -- Optional, links to a specific sale
  debtor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Optional, links to an internal member who is the debtor
  customer_name TEXT, -- Optional, name of external customer/debtor
  description TEXT NOT NULL, -- A description of the debt, e.g., "Unpaid balance for Project X", "Loan to John Doe"
  original_amount NUMERIC NOT NULL CHECK (original_amount > 0),
  amount_due NUMERIC NOT NULL CHECK (amount_due >= 0),
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('Outstanding', 'Partially Paid', 'Paid', 'Overdue')) DEFAULT 'Outstanding',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Policies for debts
-- Users can view debts they created or are the debtor for, or admins can view all
CREATE POLICY "Users can view their own debts or admins can view all" ON public.debts
FOR SELECT TO authenticated
USING (
  (auth.uid() = created_by_profile_id) OR
  (auth.uid() = debtor_profile_id) OR
  public.is_admin_or_super_admin()
);

-- Users can insert debts they created or admins can insert for others
CREATE POLICY "Users can insert their own debts or admins can insert all" ON public.debts
FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = created_by_profile_id) OR
  public.is_admin_or_super_admin()
);

-- Users can update debts they created or admins can update all
CREATE POLICY "Users can update their own debts or admins can update all" ON public.debts
FOR UPDATE TO authenticated
USING (
  (auth.uid() = created_by_profile_id) OR
  public.is_admin_or_super_admin()
)
WITH CHECK (
  (auth.uid() = created_by_profile_id) OR
  public.is_admin_or_super_admin()
);

-- Users can delete debts they created or admins can delete all
CREATE POLICY "Users can delete their own debts or admins can delete all" ON public.debts
FOR DELETE TO authenticated
USING (
  (auth.uid() = created_by_profile_id) OR
  public.is_admin_or_super_admin()
);