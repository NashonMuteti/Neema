-- Ensure the "New user" role exists
INSERT INTO public.roles (name, description, menu_privileges)
SELECT 'New user', 'Default role for newly created users (restricted until activated).', '{}'::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE name = 'New user'
);

-- Set safer defaults on profiles table
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'New user',
  ALTER COLUMN status SET DEFAULT 'Inactive',
  ALTER COLUMN enable_login SET DEFAULT false;
