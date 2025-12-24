ALTER TABLE public.expenditure_transactions
ADD CONSTRAINT expenditure_transactions_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;