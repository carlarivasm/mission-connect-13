-- Create scheduled_push table
CREATE TABLE public.scheduled_push (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  create_in_app BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_push ENABLE ROW LEVEL SECURITY;

-- Admins can manage scheduled pushes
CREATE POLICY "Admins can manage scheduled pushes" ON public.scheduled_push
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
