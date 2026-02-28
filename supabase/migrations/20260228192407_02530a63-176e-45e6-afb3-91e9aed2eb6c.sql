
-- Allow authenticated users to read basic profile info of org chart members
CREATE POLICY "Users can view org member profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id IN (SELECT profile_id FROM public.org_positions WHERE profile_id IS NOT NULL)
  );
