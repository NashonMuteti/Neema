ALTER TABLE public.financial_accounts
ADD CONSTRAINT financial_accounts_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;