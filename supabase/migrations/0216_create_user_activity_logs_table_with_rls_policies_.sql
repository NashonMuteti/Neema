-- Create user_activity_logs table
CREATE TABLE public.user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for user_activity_logs
-- Authenticated users can view their own activity, Admins/Super Admins can view all
CREATE POLICY "Users can view their own activity or admins can view all" ON public.user_activity_logs
FOR SELECT TO authenticated
USING (
  (auth.uid() = user_id) OR public.is_admin_or_super_admin()
);

-- Authenticated users can insert their own activity, Admins/Super Admins can insert for others
CREATE POLICY "Users can insert their own activity or admins can insert all" ON public.user_activity_logs
FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_id) OR public.is_admin_or_super_admin()
);

-- Only Admins/Super Admins can delete activity logs (logs should generally be immutable)
CREATE POLICY "Admins can delete activity logs" ON public.user_activity_logs
FOR DELETE TO authenticated
USING (public.is_admin_or_super_admin());

-- No update policy (activity logs should be immutable)