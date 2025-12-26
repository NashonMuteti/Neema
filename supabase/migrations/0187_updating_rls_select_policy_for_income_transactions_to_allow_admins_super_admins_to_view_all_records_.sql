-- Drop the existing SELECT policy for income_transactions
DROP POLICY IF EXISTS "Allow users to only view their own income transactions" ON public.income_transactions;

-- Recreate the SELECT policy to allow users to view their own data OR admins/super admins to view all
CREATE POLICY "Allow authenticated users to view their own income transactions or all for admins"
ON public.income_transactions FOR SELECT TO authenticated
USING (
  (profile_id = auth.uid()) OR public.is_admin_or_super_admin()
);