CREATE OR REPLACE FUNCTION public.transfer_funds_atomic(p_source_account_id uuid, p_destination_account_id uuid, p_amount numeric, p_actor_profile_id uuid, p_purpose text, p_source text, p_is_transfer boolean DEFAULT false, p_project_id uuid DEFAULT NULL::uuid, p_member_id uuid DEFAULT NULL::uuid, p_payment_method text DEFAULT NULL::text, p_pledge_id uuid DEFAULT NULL::uuid, p_transaction_profile_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_source_balance NUMERIC;
    current_destination_balance NUMERIC;
    final_transaction_profile_id UUID := COALESCE(p_transaction_profile_id, p_actor_profile_id);
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive.';
    END IF;

    IF p_source_account_id IS NOT NULL THEN
        SELECT current_balance INTO current_source_balance
        FROM public.financial_accounts
        WHERE id = p_source_account_id AND profile_id = p_actor_profile_id
        FOR UPDATE;

        IF current_source_balance IS NULL THEN
            RAISE EXCEPTION 'Source account not found or not owned by user.';
        END IF;

        IF current_source_balance < p_amount THEN
            RAISE EXCEPTION 'Insufficient balance in source account.';
        END IF;

        UPDATE public.financial_accounts
        SET current_balance = current_source_balance - p_amount
        WHERE id = p_source_account_id AND profile_id = p_actor_profile_id;

        INSERT INTO public.expenditure_transactions (profile_id, account_id, amount, purpose, date)
        VALUES (final_transaction_profile_id, p_source_account_id, p_amount, p_purpose, NOW());
    END IF;

    IF p_destination_account_id IS NOT NULL THEN
        SELECT current_balance INTO current_destination_balance
        FROM public.financial_accounts
        WHERE id = p_destination_account_id AND profile_id = p_actor_profile_id
        FOR UPDATE;

        IF current_destination_balance IS NULL THEN
            RAISE EXCEPTION 'Destination account not found or not owned by user.';
        END IF;

        UPDATE public.financial_accounts
        SET current_balance = current_destination_balance + p_amount
        WHERE id = p_destination_account_id AND profile_id = p_actor_profile_id;

        -- Only insert income transaction if it's NOT a pledge payment (pledge_id is null)
        -- Pledge payments will be handled by record_pledge_payment_atomic
        IF p_pledge_id IS NULL THEN
            INSERT INTO public.income_transactions (profile_id, account_id, amount, source, date, pledge_id)
            VALUES (final_transaction_profile_id, p_destination_account_id, p_amount, p_source, NOW(), NULL); -- Explicitly NULL pledge_id
        END IF;
    END IF;

    -- Handle project collection if applicable (this is a direct collection, not a pledge payment)
    IF p_project_id IS NOT NULL AND p_member_id IS NOT NULL AND p_payment_method IS NOT NULL AND NOT p_is_transfer AND p_pledge_id IS NULL THEN
        INSERT INTO public.project_collections (project_id, member_id, amount, date, payment_method)
        VALUES (p_project_id, p_member_id, p_amount, NOW(), p_payment_method);
    END IF;

    -- REMOVED: Pledge status update logic. This is now handled by record_pledge_payment_atomic.
    -- IF p_pledge_id IS NOT NULL AND NOT p_is_transfer THEN
    --     UPDATE public.project_pledges
    --     SET status = 'Paid'
    --     WHERE id = p_pledge_id;
    -- END IF;

    IF p_is_transfer AND (p_source_account_id IS NULL OR p_destination_account_id IS NULL) THEN
        RAISE EXCEPTION 'Both source and destination accounts are required for a fund transfer.';
    END IF;

END;
$function$;