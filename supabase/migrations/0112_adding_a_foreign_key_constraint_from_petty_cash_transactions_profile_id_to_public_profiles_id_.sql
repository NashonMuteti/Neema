ALTER TABLE public.petty_cash_transactions
ADD CONSTRAINT petty_cash_transactions_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;