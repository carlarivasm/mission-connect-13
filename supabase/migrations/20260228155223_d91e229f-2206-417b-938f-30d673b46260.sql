
-- Surveys table
CREATE TABLE public.surveys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active surveys" ON public.surveys
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage surveys" ON public.surveys
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Survey questions table
CREATE TABLE public.survey_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view questions" ON public.survey_questions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage questions" ON public.survey_questions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Survey options table
CREATE TABLE public.survey_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.survey_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view options" ON public.survey_options
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage options" ON public.survey_options
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Survey responses table
CREATE TABLE public.survey_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.survey_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(survey_id, question_id, user_id)
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own responses" ON public.survey_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own responses" ON public.survey_responses
  FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage responses" ON public.survey_responses
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
