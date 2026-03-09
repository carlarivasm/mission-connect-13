
-- Fix 1: Restrict authorized_missionaries SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can view authorized missionaries" ON public.authorized_missionaries;

CREATE POLICY "Admins can view authorized missionaries"
  ON public.authorized_missionaries
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Replace the broad org member profile policy with a restricted one
DROP POLICY IF EXISTS "Users can view org member profiles" ON public.profiles;

-- Create a view with only non-sensitive fields for org chart display
CREATE OR REPLACE VIEW public.profiles_org_public
WITH (security_invoker = on) AS
  SELECT id, full_name, avatar_url
  FROM public.profiles
  WHERE id IN (SELECT profile_id FROM public.org_positions WHERE profile_id IS NOT NULL);

-- Grant access to the view
GRANT SELECT ON public.profiles_org_public TO authenticated;
