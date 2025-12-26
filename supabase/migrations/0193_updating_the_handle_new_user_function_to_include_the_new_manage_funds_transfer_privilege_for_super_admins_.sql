CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, image_url, role, status, enable_login, receive_notifications)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    COALESCE(new.raw_user_meta_data ->> 'role', 'Contributor'),
    COALESCE(new.raw_user_meta_data ->> 'status', 'Active'),
    COALESCE((new.raw_user_meta_data ->> 'enable_login')::boolean, true),
    COALESCE((new.raw_user_meta_data ->> 'receive_notifications')::boolean, true)
  );

  -- Update Super Admin role to include the new privilege
  UPDATE public.roles
  SET menu_privileges = ARRAY(SELECT DISTINCT unnest(menu_privileges || '{Manage Funds Transfer}'))
  WHERE name = 'Super Admin';

  RETURN new;
END;
$$;