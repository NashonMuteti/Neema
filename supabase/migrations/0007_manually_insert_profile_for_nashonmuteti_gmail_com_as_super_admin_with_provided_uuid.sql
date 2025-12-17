INSERT INTO public.profiles (id, name, email, role, status, enable_login, image_url)
VALUES (
  '01d2ccc4-f178-4fe2-ac77-29a7402c1c2e',
  'Nashon Muteti',
  'nashonmuteti@gmail.com',
  'Super Admin',
  'Active',
  TRUE,
  'https://api.dicebear.com/8.x/initials/svg?seed=NashonMuteti'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  enable_login = EXCLUDED.enable_login,
  image_url = EXCLUDED.image_url;