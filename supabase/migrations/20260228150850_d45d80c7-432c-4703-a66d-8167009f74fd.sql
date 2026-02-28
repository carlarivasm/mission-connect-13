
-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  event_type TEXT NOT NULL DEFAULT 'missão',
  location TEXT,
  meeting_link TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Materials table
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  file_url TEXT,
  link_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Mission locations table
CREATE TABLE public.mission_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'pendente',
  needs TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_locations ENABLE ROW LEVEL SECURITY;

-- RLS: Events - everyone authenticated can read, admins can manage
CREATE POLICY "Authenticated can view events" ON public.events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage events" ON public.events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Materials - everyone authenticated can read, admins can manage
CREATE POLICY "Authenticated can view materials" ON public.materials
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage materials" ON public.materials
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Mission locations - everyone authenticated can read, admins can manage
CREATE POLICY "Authenticated can view locations" ON public.mission_locations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage locations" ON public.mission_locations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Authorized missionaries - admins can manage (already exists for select)
-- Add insert policy for admins
CREATE POLICY "Admins can insert authorized missionaries" ON public.authorized_missionaries
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update authorized missionaries" ON public.authorized_missionaries
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete authorized missionaries" ON public.authorized_missionaries
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
