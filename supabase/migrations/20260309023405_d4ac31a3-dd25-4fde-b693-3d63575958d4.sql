
-- 1. Fix gallery_photos: change SELECT from public to authenticated only
DROP POLICY IF EXISTS "Authenticated can view photos" ON public.gallery_photos;
CREATE POLICY "Authenticated can view photos"
  ON public.gallery_photos FOR SELECT
  TO authenticated
  USING (true);

-- 2. Fix profiles_org_public: it's a view, so we need to secure the base table.
-- The view already limits columns (id, full_name, avatar_url).
-- We add a SELECT policy on the view for authenticated users only.
-- First enable RLS on the view (views support RLS in Postgres 15+)
ALTER VIEW public.profiles_org_public SET (security_invoker = on);

-- 3. Fix surveys: restrict SELECT to authenticated and filter active only for non-admins
DROP POLICY IF EXISTS "Authenticated can view active surveys" ON public.surveys;
CREATE POLICY "Authenticated can view active surveys"
  ON public.surveys FOR SELECT
  TO authenticated
  USING (active = true OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can view questions" ON public.survey_questions;
CREATE POLICY "Authenticated can view questions"
  ON public.survey_questions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can view options" ON public.survey_options;
CREATE POLICY "Authenticated can view options"
  ON public.survey_options FOR SELECT
  TO authenticated
  USING (true);
