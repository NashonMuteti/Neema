DROP POLICY IF EXISTS "Allow authenticated users to view income transactions" ON public.income_transactions;
CREATE POLICY "Users can only view their own income transactions" ON public.income_transactions
FOR SELECT TO authenticated USING (auth.uid() = user_id);