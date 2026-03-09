-- Fix 1: Update handle_new_user to block unauthorized signups server-side
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  IF user_count > 0 AND NOT EXISTS (
    SELECT 1 FROM public.authorized_missionaries
    WHERE email = NEW.email AND used = false
  ) THEN
    RAISE EXCEPTION 'Email not authorized for signup';
  END IF;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.authorized_missionaries WHERE email = NEW.email AND used = false) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'missionary');
    UPDATE public.authorized_missionaries SET used = true WHERE email = NEW.email;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix 2: Make mission-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'mission-photos';

-- Remove any public SELECT policy on mission-photos
DROP POLICY IF EXISTS "Public can view mission photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view mission photos" ON storage.objects;

-- Ensure authenticated-only access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can view mission photos' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated can view mission photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''mission-photos'')';
  END IF;
END $$;