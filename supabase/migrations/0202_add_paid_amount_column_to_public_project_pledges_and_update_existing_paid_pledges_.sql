-- Add paid_amount column to public.project_pledges
ALTER TABLE public.project_pledges
ADD COLUMN paid_amount NUMERIC DEFAULT 0;

-- Update existing 'Paid' pledges to have paid_amount equal to their original amount
UPDATE public.project_pledges
SET paid_amount = amount
WHERE status = 'Paid';

-- Add a check constraint to ensure paid_amount does not exceed amount
ALTER TABLE public.project_pledges
ADD CONSTRAINT chk_paid_amount_less_than_or_equal_to_amount
CHECK (paid_amount <= amount);