
CREATE TABLE public.dashboard_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Importante',
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  storage_path text,
  publish_at timestamptz NOT NULL DEFAULT now(),
  expire_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage banners"
  ON public.dashboard_banners
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view active banners"
  ON public.dashboard_banners
  FOR SELECT
  TO authenticated
  USING (active = true AND publish_at <= now() AND expire_at > now());
