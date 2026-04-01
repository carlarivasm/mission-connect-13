CREATE OR REPLACE VIEW public.user_status AS
SELECT
  u.id,
  u.last_sign_in_at,
  u.email_confirmed_at
FROM auth.users u;