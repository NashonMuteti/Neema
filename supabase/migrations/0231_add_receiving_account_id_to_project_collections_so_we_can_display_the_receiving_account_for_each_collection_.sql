ALTER TABLE public.project_collections
  ADD COLUMN IF NOT EXISTS receiving_account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL;