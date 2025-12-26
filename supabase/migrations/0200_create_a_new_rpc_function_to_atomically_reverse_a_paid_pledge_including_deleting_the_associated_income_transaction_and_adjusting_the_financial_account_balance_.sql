CREATE OR REPLACE FUNCTION public.reverse_paid_pledge_atomic(
    p_pledge_id UUID,
    p_profile_id UUID -- The profile_id of the user who recorded the income (for ownership check)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pledge_amount NUMERIC;
    v_account_id UUID;
    v_income_tx_id UUID;
    v_current_balance NUMERIC;
    v_pledge_status TEXT;
BEGIN
    -- 1. Fetch pledge details and verify ownership/status
    SELECT amount, status INTO v_pledge_amount, v_pledge_status
    FROM public.project_pledges
    WHERE id = p_pledge_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pledge with ID % not found.', p_pledge_id;
    END IF;

    IF v_pledge_status <> 'Paid' THEN
        RAISE EXCEPTION 'Pledge with ID % is not marked as Paid and cannot be reversed.', p_pledge_id;
    END IF;

    -- 2. Find the corresponding income transaction
    SELECT id, account_id INTO v_income_tx_id, v_account_id
    FROM public.income_transactions
    WHERE pledge_id = p_pledge_id
      AND profile_id = p_profile_id -- Ensure the user who recorded the income is the one reversing it
      AND amount = v_pledge_amount; -- Double check amount for safety

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Corresponding income transaction for pledge ID % not found or not recorded by this user.', p_pledge_id;
    END IF;

    -- 3. Deduct the amount from the financial account's current_balance
    SELECT current_balance INTO v_current_balance
    FROM public.financial_accounts
    WHERE id = v_account_id AND profile_id = p_profile_id
    FOR UPDATE; -- Lock the row

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Financial account with ID % not found or not owned by user.', v_account_id;
    END IF;

    IF v_current_balance < v_pledge_amount THEN
        RAISE EXCEPTION 'Insufficient balance in account % to reverse pledge payment.', v_account_id;
    END IF;

    UPDATE public.financial_accounts
    SET current_balance = v_current_balance - v_pledge_amount
    WHERE id = v_account_id AND profile_id = p_profile_id;

    -- 4. Delete the income transaction
    DELETE FROM public.income_transactions
    WHERE id = v_income_tx_id;

    -- 5. Delete the pledge itself
    DELETE FROM public.project_pledges
    WHERE id = p_pledge_id;

END;
$$;