-- Add a foreign key constraint to link public.profiles.role to public.roles.name
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profile_role
FOREIGN KEY (role) REFERENCES public.roles(name)
ON UPDATE CASCADE
ON DELETE RESTRICT;