
-- Add google_maps_url to mission_locations
ALTER TABLE public.mission_locations ADD COLUMN IF NOT EXISTS google_maps_url text;

-- Create table for user-submitted notes per location
CREATE TABLE public.location_user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.mission_locations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  needs text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(location_id, user_id)
);

ALTER TABLE public.location_user_notes ENABLE ROW LEVEL SECURITY;

-- Users can view their own notes
CREATE POLICY "Users can view own location notes"
ON public.location_user_notes FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Users can insert their own notes
CREATE POLICY "Users can insert own location notes"
ON public.location_user_notes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own notes
CREATE POLICY "Users can update own location notes"
ON public.location_user_notes FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Admins can manage all notes
CREATE POLICY "Admins can manage all location notes"
ON public.location_user_notes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
