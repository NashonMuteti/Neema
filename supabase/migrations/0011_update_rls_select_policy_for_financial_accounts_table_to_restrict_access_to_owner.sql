DROP POLICY IF EXISTS "Allow authenticated users to view financial accounts" ON public.financial_accounts;
CREATE POLICY "Users can only view their own financial accounts" ON public.financial_accounts
FOR SELECT TO authenticated USING (auth.uid() = user_id);