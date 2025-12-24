ALTER TABLE public.income_transactions
ADD CONSTRAINT income_transactions_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;