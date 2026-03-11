
CREATE TABLE public.scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  link text DEFAULT '/dashboard',
  scheduled_at timestamp with time zone NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  source_type text NOT NULL DEFAULT 'broadcast',
  source_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scheduled notifications"
ON public.scheduled_notifications
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
