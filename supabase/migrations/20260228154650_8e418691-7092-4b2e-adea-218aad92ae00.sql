
-- Create gallery_photos table
CREATE TABLE public.gallery_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caption text,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_by_name text NOT NULL DEFAULT '',
  mission_location text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view
CREATE POLICY "Authenticated can view photos" ON public.gallery_photos
  FOR SELECT USING (true);

-- Authenticated users can insert their own photos
CREATE POLICY "Authenticated can upload photos" ON public.gallery_photos
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Users can delete own photos, admins can delete any
CREATE POLICY "Users can delete own photos" ON public.gallery_photos
  FOR DELETE USING (
    uploaded_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Create storage bucket for mission photos
INSERT INTO storage.buckets (id, name, public) VALUES ('mission-photos', 'mission-photos', true);

-- Storage policies
CREATE POLICY "Authenticated can upload mission photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'mission-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view mission photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'mission-photos');

CREATE POLICY "Users can delete own mission photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'mission-photos' AND auth.uid()::text = (storage.foldername(name))[1]
  );
