
-- Add question_type to survey_questions
ALTER TABLE public.survey_questions 
ADD COLUMN question_type text NOT NULL DEFAULT 'multiple_choice';

-- Add response_text to survey_responses for open-ended answers
ALTER TABLE public.survey_responses 
ADD COLUMN response_text text;

-- Make option_id nullable (open-ended questions have no option)
ALTER TABLE public.survey_responses 
ALTER COLUMN option_id DROP NOT NULL;
