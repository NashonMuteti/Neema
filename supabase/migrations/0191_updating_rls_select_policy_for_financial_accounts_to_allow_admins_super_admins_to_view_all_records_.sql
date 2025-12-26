-- Drop the existing SELECT policy for financial_accounts
DROP POLICY IF EXISTS "Users can only view their own financial accounts" ON public.financial_accounts;

-- Recreate the SELECT policy to allow users to view their own data OR admins/super admins to view all
CREATE POLICY "Allow authenticated users to view their own financial accounts or all for admins"
ON public.financial_accounts FOR SELECT TO authenticated
USING (
  (profile_id = auth.uid()) OR public.is_admin_or_super_admin()
);