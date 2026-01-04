-- Create debt_payments table
CREATE TABLE public.debt_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID REFERENCES public.debts(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- The user who recorded this payment
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  payment_method TEXT, -- e.g., 'cash', 'bank-transfer'
  received_into_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

-- Policies for debt_payments
-- Users can view payments for debts they can view
CREATE POLICY "Users can view payments for their accessible debts" ON public.debt_payments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.debts WHERE debts.id = debt_payments.debt_id AND ((debts.created_by_profile_id = auth.uid()) OR (debts.debtor_profile_id = auth.uid()) OR public.is_admin_or_super_admin())));

-- Users can insert payments for debts they created or admins can insert for others
CREATE POLICY "Users can insert payments for their created debts or admins can insert all" ON public.debt_payments
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.debts WHERE debts.id = debt_payments.debt_id AND ((debts.created_by_profile_id = auth.uid()) OR public.is_admin_or_super_admin())));

-- Users can update payments for debts they created or admins can update all
CREATE POLICY "Users can update payments for their created debts or admins can update all" ON public.debt_payments
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.debts WHERE debts.id = debt_payments.debt_id AND ((debts.created_by_profile_id = auth.uid()) OR public.is_admin_or_super_admin())))
WITH CHECK (EXISTS (SELECT 1 FROM public.debts WHERE debts.id = debt_payments.debt_id AND ((debts.created_by_profile_id = auth.uid()) OR public.is_admin_or_super_admin())));

-- Users can delete payments for debts they created or admins can delete all
CREATE POLICY "Users can delete payments for their created debts or admins can delete all" ON public.debt_payments
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.debts WHERE debts.id = debt_payments.debt_id AND ((debts.created_by_profile_id = auth.uid()) OR public.is_admin_or_super_admin())));