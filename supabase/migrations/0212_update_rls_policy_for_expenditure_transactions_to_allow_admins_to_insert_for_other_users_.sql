-- Drop existing INSERT policy for expenditure_transactions
DROP POLICY IF EXISTS "Allow users to insert their own expenditure transactions" ON public.expenditure_transactions;

-- Create new INSERT policy for expenditure_transactions allowing admins to insert for others
CREATE POLICY "Allow authenticated users to insert their own expenditure or admins to insert for others"
ON public.expenditure_transactions FOR INSERT TO authenticated
WITH CHECK ((profile_id = auth.uid()) OR public.is_admin_or_super_admin());