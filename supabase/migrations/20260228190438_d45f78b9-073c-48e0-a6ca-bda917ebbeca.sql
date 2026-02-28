
-- App settings table for admin customization
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage app settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Insert defaults
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
  ('app_name', 'Juventude e Família Missionária'),
  ('primary_color', '220 60% 25%'),
  ('secondary_color', '38 80% 55%'),
  ('logo_url', '')
ON CONFLICT (setting_key) DO NOTHING;

-- Add unique constraint on location_user_notes for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'location_user_notes_location_user_unique'
  ) THEN
    ALTER TABLE public.location_user_notes ADD CONSTRAINT location_user_notes_location_user_unique UNIQUE (location_id, user_id);
  END IF;
END $$;

-- Add user_address column to location_user_notes
ALTER TABLE public.location_user_notes ADD COLUMN IF NOT EXISTS user_address text;
