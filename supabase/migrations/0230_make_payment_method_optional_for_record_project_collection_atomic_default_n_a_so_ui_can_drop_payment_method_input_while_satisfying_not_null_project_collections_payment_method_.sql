CREATE OR REPLACE FUNCTION public.record_project_collection_atomic(
  p_destination_account_id uuid,
  p_amount numeric,
  p_actor_profile_id uuid,
  p_project_id uuid,
  p_member_id uuid,
  p_payment_method text DEFAULT 'N/A',
  p_collection_date timestamptz DEFAULT now(),
  p_source text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_destination_balance numeric;
  v_source text;
  v_payment_method text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive.';
  END IF;

  -- Ensure destination account exists and is owned by the actor
  SELECT current_balance
    INTO current_destination_balance
  FROM public.financial_accounts
  WHERE id = p_destination_account_id
    AND profile_id = p_actor_profile_id
  FOR UPDATE;

  IF current_destination_balance IS NULL THEN
    RAISE EXCEPTION 'Destination account not found or not owned by user.';
  END IF;

  UPDATE public.financial_accounts
  SET current_balance = current_destination_balance + p_amount
  WHERE id = p_destination_account_id
    AND profile_id = p_actor_profile_id;

  v_source := COALESCE(p_source, 'Project Collection');
  v_payment_method := COALESCE(NULLIF(p_payment_method, ''), 'N/A');

  -- Record income transaction against the member who paid
  INSERT INTO public.income_transactions (profile_id, account_id, amount, source, date, pledge_id)
  VALUES (p_member_id, p_destination_account_id, p_amount, v_source, p_collection_date, NULL);

  -- Record project collection
  INSERT INTO public.project_collections (project_id, member_id, amount, date, payment_method)
  VALUES (p_project_id, p_member_id, p_amount, p_collection_date, v_payment_method);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_project_collection_atomic(uuid, numeric, uuid, uuid, uuid, text, timestamptz, text) TO authenticated;
