-- Add the new column to the financial_accounts table
ALTER TABLE public.financial_accounts
ADD COLUMN can_receive_payments BOOLEAN DEFAULT TRUE;

-- Update existing rows to set can_receive_payments to TRUE for all existing accounts
UPDATE public.financial_accounts
SET can_receive_payments = TRUE
WHERE can_receive_payments IS NULL;

-- Ensure the column is NOT NULL after setting default values
ALTER TABLE public.financial_accounts
ALTER COLUMN can_receive_payments SET NOT NULL;

-- Drop existing update policy to recreate it with admin access
DROP POLICY IF EXISTS "Allow account creators to update their own financial accounts" ON public.financial_accounts;

-- Recreate the update policy to allow account creators to update their own accounts
CREATE POLICY "Allow account creators to update their own financial accounts" ON public.financial_accounts
FOR UPDATE TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Create a new RLS policy to allow Admin and Super Admin roles to update any financial account
CREATE POLICY "Admins and Super Admins can update all financial accounts" ON public.financial_accounts
FOR UPDATE TO authenticated
USING (is_admin_or_super_admin())
WITH CHECK (is_admin_or_super_admin());