
-- Add conditional logic to survey_options
ALTER TABLE public.survey_options 
  ADD COLUMN IF NOT EXISTS next_question_id uuid REFERENCES public.survey_questions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ends_survey boolean NOT NULL DEFAULT false;

-- Add end message to surveys
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS end_message text DEFAULT 'Obrigado pela sua participação!';
