ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_phone_in_org boolean NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.profiles_org_public AS
SELECT id, full_name, avatar_url, phone, show_phone_in_org
FROM public.profiles;

ALTER VIEW public.profiles_org_public SET (security_invoker = on);