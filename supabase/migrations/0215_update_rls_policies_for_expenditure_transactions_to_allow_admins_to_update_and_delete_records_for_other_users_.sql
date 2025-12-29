-- Drop existing UPDATE policy for expenditure_transactions
DROP POLICY IF EXISTS "Allow users to update their own expenditure transactions" ON public.expenditure_transactions;

-- Create new UPDATE policy for expenditure_transactions allowing admins to update for others
CREATE POLICY "Allow authenticated users to update their own expenditure or admins to update for others"
ON public.expenditure_transactions FOR UPDATE TO authenticated
USING ((profile_id = auth.uid()) OR public.is_admin_or_super_admin());

-- Drop existing DELETE policy for expenditure_transactions
DROP POLICY IF EXISTS "Allow users to delete their own expenditure transactions" ON public.expenditure_transactions;

-- Create new DELETE policy for expenditure_transactions allowing admins to delete for others
CREATE POLICY "Allow authenticated users to delete their own expenditure or admins to delete for others"
ON public.expenditure_transactions FOR DELETE TO authenticated
USING ((profile_id = auth.uid()) OR public.is_admin_or_super_admin());