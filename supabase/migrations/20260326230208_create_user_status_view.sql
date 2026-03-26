-- Create a secure view to expose auth.users sign-in status to authenticated users
CREATE OR REPLACE VIEW public.user_status AS
SELECT 
    id, 
    last_sign_in_at
FROM auth.users;

-- Grant select permission to authenticated users
GRANT SELECT ON public.user_status TO authenticated;
