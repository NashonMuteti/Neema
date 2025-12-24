ALTER TABLE public.projects
ADD CONSTRAINT projects_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;