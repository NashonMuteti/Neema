-- V3__update_handle_new_user_trigger.sql

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, image_url, role, status, enable_login)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    COALESCE(new.raw_user_meta_data ->> 'role', 'Contributor'), -- Default to 'Contributor' if not provided
    COALESCE(new.raw_user_meta_data ->> 'status', 'Active'),    -- Default to 'Active' if not provided
    COALESCE((new.raw_user_meta_data ->> 'enable_login')::boolean, true) -- Default to true if not provided
  );
  RETURN new;
END;
$$;

-- Ensure the trigger is correctly set up (if not already)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();