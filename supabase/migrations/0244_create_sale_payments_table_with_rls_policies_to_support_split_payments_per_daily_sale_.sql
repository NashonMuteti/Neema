-- Create sale_payments table for split payments per sale
CREATE TABLE IF NOT EXISTS public.sale_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales_transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_payments' AND policyname = 'sale_payments_select_policy'
  ) THEN
    CREATE POLICY sale_payments_select_policy ON public.sale_payments
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.sales_transactions st
        WHERE st.id = sale_payments.sale_id
          AND ((st.profile_id = auth.uid()) OR is_admin_or_super_admin())
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_payments' AND policyname = 'sale_payments_insert_policy'
  ) THEN
    CREATE POLICY sale_payments_insert_policy ON public.sale_payments
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.sales_transactions st
        WHERE st.id = sale_payments.sale_id
          AND ((st.profile_id = auth.uid()) OR is_admin_or_super_admin())
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_payments' AND policyname = 'sale_payments_update_policy'
  ) THEN
    CREATE POLICY sale_payments_update_policy ON public.sale_payments
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.sales_transactions st
        WHERE st.id = sale_payments.sale_id
          AND ((st.profile_id = auth.uid()) OR is_admin_or_super_admin())
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.sales_transactions st
        WHERE st.id = sale_payments.sale_id
          AND ((st.profile_id = auth.uid()) OR is_admin_or_super_admin())
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_payments' AND policyname = 'sale_payments_delete_policy'
  ) THEN
    CREATE POLICY sale_payments_delete_policy ON public.sale_payments
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.sales_transactions st
        WHERE st.id = sale_payments.sale_id
          AND ((st.profile_id = auth.uid()) OR is_admin_or_super_admin())
      )
    );
  END IF;
END $$;

-- Basic constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sale_payments_amount_positive'
  ) THEN
    ALTER TABLE public.sale_payments
      ADD CONSTRAINT sale_payments_amount_positive CHECK (amount > 0);
  END IF;
END $$;
