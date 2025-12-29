-- Drop existing INSERT policy for income_transactions
DROP POLICY IF EXISTS "Allow users to insert their own income transactions" ON public.income_transactions;

-- Create new INSERT policy for income_transactions allowing admins to insert for others
CREATE POLICY "Allow authenticated users to insert their own income or admins to insert for others"
ON public.income_transactions FOR INSERT TO authenticated
WITH CHECK ((profile_id = auth.uid()) OR public.is_admin_or_super_admin());