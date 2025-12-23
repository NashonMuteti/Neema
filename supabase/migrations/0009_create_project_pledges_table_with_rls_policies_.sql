-- Create table
CREATE TABLE public.project_pledges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Paid', 'Overdue'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.project_pledges ENABLE ROW LEVEL SECURITY;

-- Policies for project_pledges
-- Allow authenticated users to view all pledges (for reporting/overview)
CREATE POLICY "Allow authenticated users to view all pledges" ON public.project_pledges
FOR SELECT TO authenticated USING (true);

-- Allow privileged users to insert pledges
CREATE POLICY "Allow privileged users to insert pledges" ON public.project_pledges
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'Super Admin', 'Project Manager')
  )
);

-- Allow privileged users to update pledges
CREATE POLICY "Allow privileged users to update pledges" ON public.project_pledges
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'Super Admin', 'Project Manager')
  )
);

-- Allow privileged users to delete pledges
CREATE POLICY "Allow privileged users to delete pledges" ON public.project_pledges
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Admin', 'Super Admin', 'Project Manager')
  )
);