-- Generic audit trigger to log inserts/updates/deletes into user_activity_logs
CREATE OR REPLACE FUNCTION public.audit_log_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_action text;
  v_details jsonb;
BEGIN
  -- Authenticated user id if available
  v_user_id := auth.uid();

  v_action := TG_OP || ' ' || TG_TABLE_NAME;

  IF TG_OP = 'INSERT' THEN
    v_details := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'op', TG_OP,
      'new', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_details := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'op', TG_OP,
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_details := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'op', TG_OP,
      'old', to_jsonb(OLD)
    );
  END IF;

  -- Avoid recursion
  IF TG_TABLE_NAME = 'user_activity_logs' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.user_activity_logs (user_id, action, details, timestamp)
  VALUES (v_user_id, v_action, v_details, now());

  RETURN NULL;
END;
$function$;

-- Attach audit triggers to core tables (excluding user_activity_logs)
DO $do$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'settings',
    'profiles',
    'roles',
    'projects',
    'financial_accounts',
    'income_transactions',
    'expenditure_transactions',
    'project_collections',
    'project_pledges',
    'debts',
    'debt_payments',
    'sales_transactions',
    'sale_items',
    'products',
    'stock_movements',
    'board_members'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I_changes ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%I_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_log_change();',
      t,
      t
    );
  END LOOP;
END;
$do$;