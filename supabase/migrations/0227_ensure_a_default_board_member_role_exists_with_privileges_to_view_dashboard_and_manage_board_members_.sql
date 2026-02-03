INSERT INTO public.roles (name, description, menu_privileges)
SELECT
  'Board Member',
  'Board member with ability to login and manage board member profiles',
  ARRAY[
    'View Dashboard',
    'View Board Members',
    'Manage Board Members'
  ]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE name = 'Board Member'
);
