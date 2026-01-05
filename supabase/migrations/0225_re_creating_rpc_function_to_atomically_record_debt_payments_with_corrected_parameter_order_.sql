CREATE OR REPLACE FUNCTION public.record_debt_payment_atomic(
    p_debt_id UUID,
    p_amount NUMERIC,
    p_payment_date TIMESTAMP WITH TIME ZONE,
    p_payment_method TEXT,
    p_received_into_account_id UUID,
    p_actor_profile_id UUID, -- Moved this parameter before p_notes
    p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_debt_record RECORD;
    v_current_account_balance NUMERIC;
    v_new_amount_due NUMERIC;
BEGIN
    -- 1. Fetch debt details and lock the row
    SELECT id, original_amount, amount_due, status, created_by_profile_id, debtor_profile_id, customer_name, description
    INTO v_debt_record
    FROM public.debts
    WHERE id = p_debt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Debt with ID % not found.', p_debt_id;
    END IF;

    -- 2. Validate amount paid
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive.';
    END IF;

    IF p_amount > v_debt_record.amount_due THEN
        RAISE EXCEPTION 'Payment amount (%.2f) exceeds remaining amount due (%.2f).', p_amount, v_debt_record.amount_due;
    END IF;

    -- 3. Update debt's amount_due and status
    v_new_amount_due := v_debt_record.amount_due - p_amount;
    
    UPDATE public.debts
    SET
        amount_due = v_new_amount_due,
        status = CASE
            WHEN v_new_amount_due <= 0 THEN 'Paid'
            ELSE 'Partially Paid'
        END
    WHERE id = p_debt_id;

    -- 4. Update financial account balance
    SELECT current_balance
    INTO v_current_account_balance
    FROM public.financial_accounts
    WHERE id = p_received_into_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Financial account with ID % not found.', p_received_into_account_id;
    END IF;

    UPDATE public.financial_accounts
    SET current_balance = v_current_account_balance + p_amount
    WHERE id = p_received_into_account_id;

    -- 5. Record income transaction
    INSERT INTO public.income_transactions (
        profile_id,
        account_id,
        amount,
        source,
        date,
        pledge_id -- pledge_id is null for debt payments
    )
    VALUES (
        v_debt_record.debtor_profile_id, -- Associate income with the debtor if they are a member
        p_received_into_account_id,
        p_amount,
        'Debt Payment for ' || COALESCE(v_debt_record.customer_name, v_debt_record.description),
        p_payment_date,
        NULL
    );

    -- 6. Log activity (optional, if you have an activity log table/function)
    -- PERFORM public.log_user_activity(p_actor_profile_id, 'Recorded Debt Payment', jsonb_build_object('debt_id', p_debt_id, 'amount', p_amount, 'debtor', COALESCE(v_debt_record.customer_name, v_debt_record.description)));

END;
$$;