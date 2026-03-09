-- Add approved column to profiles (default true for existing users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true;

-- Update handle_new_user: allow all signups, set approved based on authorized_missionaries
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_count INTEGER;
  v_is_authorized boolean;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- Check if email is pre-authorized
  SELECT EXISTS (
    SELECT 1 FROM public.authorized_missionaries WHERE email = NEW.email
  ) INTO v_is_authorized;

  -- Insert profile: approved only if first user or pre-authorized
  INSERT INTO public.profiles (id, full_name, email, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    (user_count = 0 OR v_is_authorized)
  );

  -- First user becomes admin
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    RETURN NEW;
  END IF;

  -- Assign missionary role to everyone (approved or not)
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'missionary');

  -- Mark as used if pre-authorized
  IF v_is_authorized THEN
    UPDATE public.authorized_missionaries SET used = true WHERE email = NEW.email;
  END IF;

  RETURN NEW;
END;
$$;
