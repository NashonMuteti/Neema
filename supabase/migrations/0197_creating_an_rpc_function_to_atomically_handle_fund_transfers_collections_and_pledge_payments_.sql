CREATE OR REPLACE FUNCTION public.transfer_funds_atomic(
    p_source_account_id UUID,
    p_destination_account_id UUID,
    p_amount NUMERIC,
    p_profile_id UUID,
    p_purpose TEXT,
    p_source TEXT,
    p_is_transfer BOOLEAN DEFAULT FALSE,
    p_project_id UUID DEFAULT NULL,
    p_member_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_pledge_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_source_balance NUMERIC;
    current_destination_balance NUMERIC;
BEGIN
    -- Ensure amount is positive
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive.';
    END IF;

    -- Handle deduction from source account if provided
    IF p_source_account_id IS NOT NULL THEN
        -- Lock the source account row for update
        SELECT current_balance INTO current_source_balance
        FROM public.financial_accounts
        WHERE id = p_source_account_id AND profile_id = p_profile_id
        FOR UPDATE;

        IF current_source_balance IS NULL THEN
            RAISE EXCEPTION 'Source account not found or not owned by user.';
        END IF;

        IF current_source_balance < p_amount THEN
            RAISE EXCEPTION 'Insufficient balance in source account.';
        END IF;

        UPDATE public.financial_accounts
        SET current_balance = current_source_balance - p_amount
        WHERE id = p_source_account_id AND profile_id = p_profile_id;

        -- Record expenditure transaction
        INSERT INTO public.expenditure_transactions (profile_id, account_id, amount, purpose, date)
        VALUES (p_profile_id, p_source_account_id, p_amount, p_purpose, NOW());
    END IF;

    -- Handle addition to destination account if provided
    IF p_destination_account_id IS NOT NULL THEN
        -- Lock the destination account row for update
        SELECT current_balance INTO current_destination_balance
        FROM public.financial_accounts
        WHERE id = p_destination_account_id AND profile_id = p_profile_id
        FOR UPDATE;

        IF current_destination_balance IS NULL THEN
            RAISE EXCEPTION 'Destination account not found or not owned by user.';
        END IF;

        UPDATE public.financial_accounts
        SET current_balance = current_destination_balance + p_amount
        WHERE id = p_destination_account_id AND profile_id = p_profile_id;

        -- Record income transaction
        INSERT INTO public.income_transactions (profile_id, account_id, amount, source, date)
        VALUES (p_profile_id, p_destination_account_id, p_amount, p_source, NOW());
    END IF;

    -- Handle project collection if applicable
    IF p_project_id IS NOT NULL AND p_member_id IS NOT NULL AND p_payment_method IS NOT NULL AND NOT p_is_transfer THEN
        INSERT INTO public.project_collections (project_id, member_id, amount, date, payment_method)
        VALUES (p_project_id, p_member_id, p_amount, NOW(), p_payment_method);
    END IF;

    -- Handle pledge status update if applicable
    IF p_pledge_id IS NOT NULL AND NOT p_is_transfer THEN
        UPDATE public.project_pledges
        SET status = 'Paid'
        WHERE id = p_pledge_id;
    END IF;

    -- If it's a transfer, ensure both source and destination accounts were provided
    IF p_is_transfer AND (p_source_account_id IS NULL OR p_destination_account_id IS NULL) THEN
        RAISE EXCEPTION 'Both source and destination accounts are required for a fund transfer.';
    END IF;

END;
$$;