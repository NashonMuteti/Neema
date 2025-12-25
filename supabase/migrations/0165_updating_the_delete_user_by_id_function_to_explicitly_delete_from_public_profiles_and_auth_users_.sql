CREATE OR REPLACE FUNCTION public.delete_user_by_id(user_id_to_delete uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Delete the user from public.profiles first.
  -- This will cascade to other tables that now reference public.profiles(id)
  -- (e.g., projects, financial_accounts, income_transactions, etc.)
  DELETE FROM public.profiles WHERE id = user_id_to_delete;

  -- Then, delete the user from auth.users.
  -- This should only be done if the user actually exists in auth.users.
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_to_delete) THEN
    DELETE FROM auth.users WHERE id = user_id_to_delete;
  END IF;

  -- If the profile was deleted but no auth.users entry existed,
  -- the function still completes successfully for the profile deletion.
END;
$function$;