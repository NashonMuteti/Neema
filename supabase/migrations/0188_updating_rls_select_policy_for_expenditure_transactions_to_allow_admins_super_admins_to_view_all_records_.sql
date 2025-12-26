-- Drop the existing SELECT policy for expenditure_transactions
DROP POLICY IF EXISTS "Allow users to only view their own expenditure transactions" ON public.expenditure_transactions;

-- Recreate the SELECT policy to allow users to view their own data OR admins/super admins to view all
CREATE POLICY "Allow authenticated users to view their own expenditure transactions or all for admins"
ON public.expenditure_transactions FOR SELECT TO authenticated
USING (
  (profile_id = auth.uid()) OR public.is_admin_or_super_admin()
);