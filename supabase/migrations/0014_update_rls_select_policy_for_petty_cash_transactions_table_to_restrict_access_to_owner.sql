DROP POLICY IF EXISTS "Allow authenticated users to view petty cash transactions" ON public.petty_cash_transactions;
CREATE POLICY "Users can only view their own petty cash transactions" ON public.petty_cash_transactions
FOR SELECT TO authenticated USING (auth.uid() = user_id);