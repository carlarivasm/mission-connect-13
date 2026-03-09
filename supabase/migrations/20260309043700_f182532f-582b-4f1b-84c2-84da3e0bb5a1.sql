-- Function to notify all admins when a new user signs up with an unauthorized email
CREATE OR REPLACE FUNCTION public.notify_admins_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_is_authorized boolean;
  v_user_name text;
BEGIN
  -- Check if the email was pre-authorized
  SELECT EXISTS (
    SELECT 1 FROM public.authorized_missionaries WHERE email = NEW.email
  ) INTO v_is_authorized;

  -- Only notify if NOT pre-authorized
  IF NOT v_is_authorized THEN
    v_user_name := NEW.full_name;

    -- Notify each admin
    FOR v_admin_id IN
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        v_admin_id,
        '🆕 Novo cadastro não autorizado',
        v_user_name || ' (' || NEW.email || ') se cadastrou sem estar na lista de missionários autorizados.',
        'admin',
        jsonb_build_object('new_user_id', NEW.id, 'email', NEW.email)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on profiles insert
DROP TRIGGER IF EXISTS on_new_profile_notify_admin ON public.profiles;
CREATE TRIGGER on_new_profile_notify_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_signup();
