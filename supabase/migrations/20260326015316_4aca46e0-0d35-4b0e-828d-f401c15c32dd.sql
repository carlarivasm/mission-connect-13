
-- Add is_anonymous to surveys
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

-- Create survey_drafts table for saving progress
CREATE TABLE public.survey_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_step integer NOT NULL DEFAULT 0,
  question_path jsonb NOT NULL DEFAULT '[0]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(survey_id, user_id)
);

ALTER TABLE public.survey_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own drafts" ON public.survey_drafts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all drafts" ON public.survey_drafts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
