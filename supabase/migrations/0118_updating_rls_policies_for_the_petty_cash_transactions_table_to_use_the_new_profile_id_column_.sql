-- Drop existing policies that use user_id
DROP POLICY IF EXISTS "Users can only view their own petty cash transactions" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Allow users to insert their own petty cash transactions" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Allow users to update their own petty cash transactions" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "Allow users to delete their own petty cash transactions" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "updating_rls_policy_for_petty_cash_transactions_select_to_use_scalar_subquery_for_auth_uid_" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "updating_rls_policy_for_petty_cash_transactions_insert_to_use_scalar_subquery_for_auth_uid_" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "updating_rls_policy_for_petty_cash_transactions_update_to_use_scalar_subquery_for_auth_uid_" ON public.petty_cash_transactions;
DROP POLICY IF EXISTS "updating_rls_policy_for_petty_cash_transactions_delete_to_use_scalar_subquery_for_auth_uid_" ON public.petty_cash_transactions;

-- Recreate policies using profile_id
CREATE POLICY "Users can only view their own petty cash transactions" ON public.petty_cash_transactions
FOR SELECT TO authenticated USING (profile_id = (SELECT auth.uid()));

CREATE POLICY "Allow users to insert their own petty cash transactions" ON public.petty_cash_transactions
FOR INSERT TO authenticated WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "Allow users to update their own petty cash transactions" ON public.petty_cash_transactions
FOR UPDATE TO authenticated USING (profile_id = (SELECT auth.uid()));

CREATE POLICY "Allow users to delete their own petty cash transactions" ON public.petty_cash_transactions
FOR DELETE TO authenticated USING (profile_id = (SELECT auth.uid()));