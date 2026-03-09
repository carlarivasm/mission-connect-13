CREATE OR REPLACE VIEW public.profiles_org_public AS
SELECT id, full_name, avatar_url, phone
FROM public.profiles;