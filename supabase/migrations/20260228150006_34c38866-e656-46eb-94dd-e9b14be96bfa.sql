
-- Update the handle_new_user function to make first user admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  -- Check if this is the first user (make them admin)
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    RETURN NEW;
  END IF;
  
  -- Check if this email is an authorized missionary
  IF EXISTS (SELECT 1 FROM public.authorized_missionaries WHERE email = NEW.email AND used = false) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'missionary');
    UPDATE public.authorized_missionaries SET used = true WHERE email = NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;
