
-- Add media_type to gallery_photos to distinguish photos from videos
ALTER TABLE public.gallery_photos ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';

-- Formation categories table
CREATE TABLE IF NOT EXISTS public.formation_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.formation_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage formation categories"
  ON public.formation_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view formation categories"
  ON public.formation_categories FOR SELECT
  TO authenticated
  USING (true);

-- Formation videos table
CREATE TABLE IF NOT EXISTS public.formation_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.formation_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  storage_path text NOT NULL,
  thumbnail_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.formation_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage formation videos"
  ON public.formation_videos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view formation videos"
  ON public.formation_videos FOR SELECT
  TO authenticated
  USING (true);

-- Storage bucket for formation videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('formation-videos', 'formation-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for formation-videos bucket
CREATE POLICY "Admins can upload formation videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'formation-videos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view formation videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'formation-videos');

CREATE POLICY "Admins can delete formation videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'formation-videos' AND has_role(auth.uid(), 'admin'));
