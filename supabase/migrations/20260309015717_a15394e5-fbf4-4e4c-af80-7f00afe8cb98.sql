
-- Create security definer function for email authorization check
CREATE OR REPLACE FUNCTION public.is_email_authorized(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.authorized_missionaries
    WHERE email = p_email AND used = false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_authorized TO anon, authenticated;

-- Drop the overly permissive anon SELECT policy
DROP POLICY IF EXISTS "Anyone can check authorization" ON public.authorized_missionaries;

-- Restrict SELECT to authenticated users only (for admin UI)
CREATE POLICY "Authenticated can view authorized missionaries"
  ON public.authorized_missionaries
  FOR SELECT
  TO authenticated
  USING (true);
