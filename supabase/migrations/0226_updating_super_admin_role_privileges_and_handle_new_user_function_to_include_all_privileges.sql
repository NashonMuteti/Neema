-- Drop the existing trigger to allow modification of the handle_new_user function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the existing handle_new_user function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the handle_new_user function to correctly assign all privileges to Super Admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  all_privileges TEXT[] := ARRAY[
    'View Dashboard',
    'View Project Accounts',
    'Manage Projects',
    'View Pledges',
    'Manage Pledges',
    'View Income',
    'Manage Income',
    'View Expenditure',
    'Manage Expenditure',
    'View Sales Management',
    'View Stocks',
    'Manage Stocks',
    'Manage Stock Status',
    'View Daily Sales',
    'Manage Daily Sales',
    'View Debts',
    'Manage Debts',
    'View Members',
    'Manage Members',
    'Export Member List PDF',
    'Export Member List Excel',
    'View Board Members',
    'Manage Board Members',
    'View Reports',
    'View Member Contributions Report',
    'View Pledge Report',
    'View Table Banking Summary',
    'View User Activity Report',
    'View Deleted Projects Report',
    'Manage Reports Templates',
    'Perform Admin Actions',
    'Initialize Balances',
    'Manage Funds Transfer',
    'View My Contributions',
    'Access Admin Settings',
    'Manage User Profiles',
    'Manage User Roles',
    'Manage App Customization',
    'Manage System Currency',
    'Manage Member Fields',
    'Manage Database Maintenance',
    'Manage Financial Accounts',
    'Manage Header Customization'
  ];
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

  -- If the new user is a Super Admin, ensure their role in public.roles has all privileges
  IF COALESCE(new.raw_user_meta_data ->> 'role', 'Contributor') = 'Super Admin' THEN
    UPDATE public.roles
    SET menu_privileges = all_privileges
    WHERE name = 'Super Admin';
  END IF;

  RETURN new;
END;
$$;

-- Explicitly update the Super Admin role in public.roles to have all privileges
UPDATE public.roles
SET menu_privileges = ARRAY[
  'View Dashboard',
  'View Project Accounts',
  'Manage Projects',
  'View Pledges',
  'Manage Pledges',
  'View Income',
  'Manage Income',
  'View Expenditure',
  'Manage Expenditure',
  'View Sales Management',
  'View Stocks',
  'Manage Stocks',
  'Manage Stock Status',
  'View Daily Sales',
  'Manage Daily Sales',
  'View Debts',
  'Manage Debts',
  'View Members',
  'Manage Members',
  'Export Member List PDF',
  'Export Member List Excel',
  'View Board Members',
  'Manage Board Members',
  'View Reports',
  'View Member Contributions Report',
  'View Pledge Report',
  'View Table Banking Summary',
  'View User Activity Report',
  'View Deleted Projects Report',
  'Manage Reports Templates',
  'Perform Admin Actions',
  'Initialize Balances',
  'Manage Funds Transfer',
  'View My Contributions',
  'Access Admin Settings',
  'Manage User Profiles',
  'Manage User Roles',
  'Manage App Customization',
  'Manage System Currency',
  'Manage Member Fields',
  'Manage Database Maintenance',
  'Manage Financial Accounts',
  'Manage Header Customization'
];

-- Recreate the on_auth_user_created trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();