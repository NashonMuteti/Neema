DROP POLICY IF EXISTS "Users can only view their own petty cash transactions" ON public.petty_cash_transactions;

CREATE POLICY "Allow authenticated users to view their own petty cash transactions or all for admins" ON public.petty_cash_transactions
FOR SELECT TO authenticated USING ((profile_id = auth.uid()) OR is_admin_or_super_admin());