-- Drop existing policies that use user_id
DROP POLICY IF EXISTS "Users can only view their own financial accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Allow account creators to insert their own financial accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Allow account creators to update their own financial accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Allow account creators to delete their own financial accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "updating_rls_policy_for_financial_accounts_select_to_use_scalar_subquery_for_auth_uid_" ON public.financial_accounts;
DROP POLICY IF EXISTS "updating_rls_policy_for_financial_accounts_insert_to_use_scalar_subquery_for_auth_uid_" ON public.financial_accounts;
DROP POLICY IF EXISTS "updating_rls_policy_for_financial_accounts_update_to_use_scalar_subquery_for_auth_uid_" ON public.financial_accounts;
DROP POLICY IF EXISTS "updating_rls_policy_for_financial_accounts_delete_to_use_scalar_subquery_for_auth_uid_" ON public.financial_accounts;

-- Recreate policies using profile_id
CREATE POLICY "Users can only view their own financial accounts" ON public.financial_accounts
FOR SELECT TO authenticated USING (profile_id = (SELECT auth.uid()));

CREATE POLICY "Allow account creators to insert their own financial accounts" ON public.financial_accounts
FOR INSERT TO authenticated WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "Allow account creators to update their own financial accounts" ON public.financial_accounts
FOR UPDATE TO authenticated USING (profile_id = (SELECT auth.uid()));

CREATE POLICY "Allow account creators to delete their own financial accounts" ON public.financial_accounts
FOR DELETE TO authenticated USING (profile_id = (SELECT auth.uid()));