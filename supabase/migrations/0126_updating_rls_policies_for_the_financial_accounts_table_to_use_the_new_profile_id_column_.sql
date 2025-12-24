DROP POLICY IF EXISTS "Allow account creators to delete their own financial accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Allow account creators to insert their own financial accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Allow account creators to update their own financial accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Users can only view their own financial accounts" ON public.financial_accounts;

CREATE POLICY "Allow account creators to delete their own financial accounts" ON public.financial_accounts FOR DELETE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Allow account creators to insert their own financial accounts" ON public.financial_accounts FOR INSERT TO authenticated WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Allow account creators to update their own financial accounts" ON public.financial_accounts FOR UPDATE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can only view their own financial accounts" ON public.financial_accounts FOR SELECT TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));