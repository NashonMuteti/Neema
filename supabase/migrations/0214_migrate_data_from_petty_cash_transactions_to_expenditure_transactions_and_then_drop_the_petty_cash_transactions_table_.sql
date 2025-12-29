-- Copy data from petty_cash_transactions to expenditure_transactions
INSERT INTO public.expenditure_transactions (id, account_id, date, amount, purpose, created_at, profile_id)
SELECT id, account_id, date, amount, purpose, created_at, profile_id
FROM public.petty_cash_transactions;

-- Drop the petty_cash_transactions table
DROP TABLE public.petty_cash_transactions;