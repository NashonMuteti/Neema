DROP POLICY IF EXISTS "Allow authenticated users to view expenditure transactions" ON public.expenditure_transactions;
CREATE POLICY "Users can only view their own expenditure transactions" ON public.expenditure_transactions
FOR SELECT TO authenticated USING (auth.uid() = user_id);