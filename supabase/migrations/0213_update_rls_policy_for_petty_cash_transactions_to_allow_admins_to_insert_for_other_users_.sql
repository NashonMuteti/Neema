-- Drop existing INSERT policy for petty_cash_transactions
DROP POLICY IF EXISTS "Allow users to insert their own petty cash transactions" ON public.petty_cash_transactions;

-- Create new INSERT policy for petty_cash_transactions allowing admins to insert for others
CREATE POLICY "Allow authenticated users to insert their own petty cash or admins to insert for others"
ON public.petty_cash_transactions FOR INSERT TO authenticated
WITH CHECK ((profile_id = auth.uid()) OR public.is_admin_or_super_admin());