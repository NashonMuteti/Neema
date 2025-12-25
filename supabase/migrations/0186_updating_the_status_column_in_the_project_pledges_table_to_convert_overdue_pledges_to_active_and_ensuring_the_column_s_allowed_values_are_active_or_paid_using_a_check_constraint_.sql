-- 1. Update any existing 'Overdue' pledges to 'Active' to conform to the new allowed values.
UPDATE public.project_pledges
SET status = 'Active'
WHERE status = 'Overdue';

-- 2. (Optional, but recommended if not already present) Drop any existing CHECK constraint
--    on the 'status' column that might be named 'project_pledges_status_check'.
ALTER TABLE public.project_pledges DROP CONSTRAINT IF EXISTS project_pledges_status_check;

-- 3. Add a new CHECK constraint to ensure the 'status' column only accepts 'Active' or 'Paid'.
ALTER TABLE public.project_pledges
ADD CONSTRAINT project_pledges_status_check
CHECK (status IN ('Active', 'Paid'));