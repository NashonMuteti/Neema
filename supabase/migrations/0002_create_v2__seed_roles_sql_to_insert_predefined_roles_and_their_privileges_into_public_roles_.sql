-- V2__seed_roles.sql

-- Insert predefined roles and their privileges
INSERT INTO public.roles (id, name, description, menu_privileges)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Super Admin', 'Has full access and can manage all aspects of the application, including user roles and database maintenance.', ARRAY[
    'View Dashboard', 'View Project Accounts', 'Manage Projects', 'View Petty Cash', 'Manage Petty Cash', 'View Pledges', 'Manage Pledges', 'View Income', 'Manage Income', 'View Expenditure', 'Manage Expenditure', 'View Sales Management', 'View Stocks', 'Manage Stocks', 'View Daily Sales', 'Manage Daily Sales', 'View Debts', 'Manage Debts', 'View Members', 'Manage Members', 'Export Member List PDF', 'Export Member List Excel', 'View Board Members', 'Manage Board Members', 'View Reports', 'View Member Contributions Report', 'View Petty Cash Report', 'View Pledge Report', 'View Table Banking Summary', 'View User Activity Report', 'View Deleted Projects Report', 'Manage Reports Templates', 'Perform Admin Actions', 'Initialize Balances', 'View My Contributions', 'Access Admin Settings', 'Manage User Profiles', 'Manage User Roles', 'Manage App Customization', 'Manage System Currency', 'Manage Member Fields', 'Manage Database Maintenance', 'Manage Default Password'
  ]::text[])
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  menu_privileges = EXCLUDED.menu_privileges;

INSERT INTO public.roles (id, name, description, menu_privileges)
VALUES
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Admin', 'Manages most application settings and user data, but not core user roles or database maintenance.', ARRAY[
    'View Dashboard', 'View Project Accounts', 'Manage Projects', 'View Petty Cash', 'Manage Petty Cash', 'View Pledges', 'Manage Pledges', 'View Income', 'Manage Income', 'View Expenditure', 'Manage Expenditure', 'View Sales Management', 'View Stocks', 'Manage Stocks', 'View Daily Sales', 'Manage Daily Sales', 'View Debts', 'Manage Debts', 'View Members', 'Manage Members', 'Export Member List PDF', 'Export Member List Excel', 'View Board Members', 'Manage Board Members', 'View Reports', 'View Member Contributions Report', 'View Petty Cash Report', 'View Pledge Report', 'View Table Banking Summary', 'View User Activity Report', 'View Deleted Projects Report', 'Manage Reports Templates', 'Perform Admin Actions', 'Initialize Balances', 'View My Contributions', 'Access Admin Settings', 'Manage User Profiles', 'Manage App Customization', 'Manage System Currency', 'Manage Member Fields', 'Manage Default Password'
  ]::text[])
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  menu_privileges = EXCLUDED.menu_privileges;

INSERT INTO public.roles (id, name, description, menu_privileges)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Project Manager', 'Manages projects, pledges, and related financial aspects.', ARRAY[
    'View Dashboard', 'View Project Accounts', 'Manage Projects', 'View Pledges', 'Manage Pledges', 'View Income', 'View Expenditure', 'View Members', 'View Board Members', 'View Reports', 'View Member Contributions Report', 'View Petty Cash Report', 'View Pledge Report', 'View Table Banking Summary', 'View User Activity Report', 'View Deleted Projects Report', 'View My Contributions'
  ]::text[])
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  menu_privileges = EXCLUDED.menu_privileges;

INSERT INTO public.roles (id, name, description, menu_privileges)
VALUES
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Contributor', 'Can view most information and manage their own contributions.', ARRAY[
    'View Dashboard', 'View Project Accounts', 'View Petty Cash', 'View Pledges', 'View Income', 'View Expenditure', 'View Members', 'View Board Members', 'View Reports', 'View Member Contributions Report', 'View Petty Cash Report', 'View Pledge Report', 'View Table Banking Summary', 'View User Activity Report', 'View Deleted Projects Report', 'View My Contributions'
  ]::text[])
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  menu_privileges = EXCLUDED.menu_privileges;