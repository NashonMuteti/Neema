DROP POLICY IF EXISTS "Allow users to delete their own petty cash transactions" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Allow users to insert their own petty cash transactions" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Allow users to update their own petty cash transactions" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Users can only view their own petty cash transactions" ON public.petty_cash_transactions;

CREATE POLICY "Allow users to delete their own petty cash transactions" ON public.petty_cash_transactions FOR DELETE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Allow users to insert their own petty cash transactions" ON public.petty_cash_transactions FOR INSERT TO authenticated WITH CHECK ((profile_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Allow users to update their own petty cash transactions" ON public.petty_cash_transactions FOR UPDATE TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can only view their own petty cash transactions" ON public.petty_cash_transactions FOR SELECT TO authenticated USING ((profile_id = ( SELECT auth.uid() AS uid)));