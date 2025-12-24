CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings
CREATE POLICY "Allow public read access to settings" ON public.settings
FOR SELECT USING (true);

-- Allow users with 'Manage System Currency' privilege to update settings
CREATE POLICY "Allow privileged users to update settings" ON public.settings
FOR UPDATE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Super Admin'::text])))));

-- Insert default currency if not exists
INSERT INTO public.settings (key, value)
VALUES ('default_currency_code', 'USD')
ON CONFLICT (key) DO NOTHING;