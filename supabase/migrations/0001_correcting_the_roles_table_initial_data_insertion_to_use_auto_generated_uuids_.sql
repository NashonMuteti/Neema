-- Create roles table
CREATE TABLE public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  menu_privileges TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view roles
CREATE POLICY "Allow authenticated users to view roles" ON public.roles
FOR SELECT TO authenticated USING (true);

-- Policy: Allow privileged users (Admin, Super Admin) to insert roles
CREATE POLICY "Allow privileged users to insert roles" ON public.roles
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Super Admin'::text]))));

-- Policy: Allow privileged users (Admin, Super Admin) to update roles
CREATE POLICY "Allow privileged users to update roles" ON public.roles
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Super Admin'::text]))));

-- Policy: Allow privileged users (Admin, Super Admin) to delete roles
CREATE POLICY "Allow privileged users to delete roles" ON public.roles
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Super Admin'::text]))));

-- Insert initial roles (Super Admin, Admin, Project Manager, Contributor)
-- IDs will be auto-generated UUIDs
INSERT INTO public.roles (name, description, menu_privileges) VALUES
('Super Admin', 'Full access to all features and settings, including critical system configurations.', ARRAY[
  'View Dashboard', 'View Project Accounts', 'Manage Projects', 'View Petty Cash', 'Manage Petty Cash',
  'View Pledges', 'Manage Pledges', 'View Income', 'Manage Income', 'View Expenditure', 'Manage Expenditure',
  'View Sales Management', 'View Stocks', 'Manage Stocks', 'View Daily Sales', 'Manage Daily Sales',
  'View Debts', 'Manage Debts', 'View Members', 'Manage Members', 'Export Member List PDF', 'Export Member List Excel',
  'View Board Members', 'Manage Board Members', 'View Reports', 'View Member Contributions Report',
  'View Petty Cash Report', 'View Pledge Report', 'View Table Banking Summary', 'View User Activity Report',
  'View Deleted Projects Report', 'Manage Reports Templates', 'Perform Admin Actions', 'Initialize Balances',
  'View My Contributions', 'Access Admin Settings', 'Manage User Profiles', 'Manage User Roles',
  'Manage App Customization', 'Manage System Currency', 'Manage Member Fields', 'Manage Database Maintenance',
  'Manage Default Password'
]),
('Admin', 'Full access to all features and settings.', ARRAY[
  'View Dashboard', 'View Project Accounts', 'Manage Projects', 'View Petty Cash', 'Manage Petty Cash',
  'View Pledges', 'Manage Pledges', 'View Income', 'Manage Income', 'View Expenditure', 'Manage Expenditure',
  'View Sales Management', 'View Stocks', 'Manage Stocks', 'View Daily Sales', 'Manage Daily Sales',
  'View Debts', 'Manage Debts', 'View Members', 'Manage Members', 'Export Member List PDF', 'Export Member List Excel',
  'View Board Members', 'Manage Board Members', 'View Reports', 'View Member Contributions Report',
  'View Petty Cash Report', 'View Pledge Report', 'View Table Banking Summary', 'View User Activity Report',
  'View Deleted Projects Report', 'Manage Reports Templates', 'Perform Admin Actions',
  'View My Contributions', 'Access Admin Settings', 'Manage User Profiles', 'Manage User Roles',
  'Manage App Customization', 'Manage System Currency', 'Manage Member Fields', 'Manage Default Password'
]),
('Project Manager', 'Can create and manage projects, view reports.', ARRAY[
  'View Dashboard', 'View Project Accounts', 'Manage Projects', 'View Petty Cash', 'Manage Petty Cash',
  'View Pledges', 'Manage Pledges', 'View Income', 'Manage Income', 'View Expenditure', 'Manage Expenditure',
  'View Sales Management', 'View Stocks', 'View Daily Sales', 'View Debts', 'View Members',
  'Export Member List PDF', 'Export Member List Excel', 'View Board Members', 'View Reports',
  'View Member Contributions Report', 'View Petty Cash Report', 'View Pledge Report', 'View Table Banking Summary',
  'View My Contributions'
]),
('Contributor', 'Can record contributions and view personal reports.', ARRAY[
  'View Dashboard', 'View My Contributions', 'View Members'
]);