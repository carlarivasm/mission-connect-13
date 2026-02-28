
-- Add login_subtitle to app_settings
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('login_subtitle', 'Unidos na fé, servindo com amor')
ON CONFLICT DO NOTHING;

-- Create org chart positions table
CREATE TABLE public.org_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'equipe',
  function_name text,
  parent_id uuid REFERENCES public.org_positions(id) ON DELETE SET NULL,
  profile_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.org_positions ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "Authenticated can view org positions"
  ON public.org_positions FOR SELECT TO authenticated
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage org positions"
  ON public.org_positions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
