ALTER TABLE public.income_transactions
ADD COLUMN pledge_id UUID REFERENCES public.project_pledges(id) ON DELETE SET NULL;