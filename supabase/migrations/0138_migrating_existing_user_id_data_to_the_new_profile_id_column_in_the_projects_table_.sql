UPDATE public.projects
SET profile_id = user_id
WHERE user_id IS NOT NULL;