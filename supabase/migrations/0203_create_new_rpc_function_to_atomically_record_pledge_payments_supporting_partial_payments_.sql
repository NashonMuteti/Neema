CREATE OR REPLACE FUNCTION public.record_pledge_payment_atomic(
    p_pledge_id UUID,
    p_amount_paid NUMERIC,
    p_received_into_account_id UUID,
    p_actor_profile_id UUID,
    p_payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pledge_record RECORD;
    v_current_account_balance NUMERIC;
    v_new_paid_amount NUMERIC;
    v_remaining_amount NUMERIC;
    v_project_name TEXT;
    v_member_name TEXT;
BEGIN
    -- 1. Fetch pledge details and lock the row
    SELECT pp.id, pp.amount, pp.paid_amount, pp.member_id, pp.project_id, pp.status,
           p.name AS project_name, prof.name AS member_name
    INTO v_pledge_record
    FROM public.project_pledges pp
    JOIN public.projects p ON pp.project_id = p.id
    JOIN public.profiles prof ON pp.member_id = prof.id
    WHERE pp.id = p_pledge_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pledge with ID % not found.', p_pledge_id;
    END IF;

    -- 2. Validate amount paid
    IF p_amount_paid <= 0 THEN
        RAISE EXCEPTION 'Amount paid must be positive.';
    END IF;

    v_remaining_amount := v_pledge_record.amount - v_pledge_record.paid_amount;

    IF p_amount_paid > v_remaining_amount THEN
        RAISE EXCEPTION 'Amount paid (%.2f) exceeds remaining pledge amount (%.2f).', p_amount_paid, v_remaining_amount;
    END IF;

    -- 3. Update pledge's paid_amount and status
    v_new_paid_amount := v_pledge_record.paid_amount + p_amount_paid;
    
    UPDATE public.project_pledges
    SET
        paid_amount = v_new_paid_amount,
        status = CASE
            WHEN v_new_paid_amount >= v_pledge_record.amount THEN 'Paid'
            ELSE 'Active' -- Keep as active if partially paid
        END
    WHERE id = p_pledge_id;

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
    SET current_balance = v_current_account_balance + p_amount_paid
    WHERE id = p_received_into_account_id;

    -- 5. Record income transaction
    INSERT INTO public.income_transactions (
        profile_id,
        account_id,
        amount,
        source,
        date,
        pledge_id
    )
    VALUES (
        v_pledge_record.member_id, -- Associate income with the member who made the pledge
        p_received_into_account_id,
        p_amount_paid,
        'Pledge Payment for Project: ' || v_pledge_record.project_name || ' from ' || v_pledge_record.member_name,
        p_payment_date,
        p_pledge_id
    );

END;
$$;