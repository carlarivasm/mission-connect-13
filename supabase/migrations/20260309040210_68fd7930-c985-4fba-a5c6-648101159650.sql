
-- Function triggered when a user is added to a family group
-- It inserts a notification for the newly added user
CREATE OR REPLACE FUNCTION public.notify_user_added_to_family()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_name text;
  v_creator_name text;
BEGIN
  -- Get family group name
  SELECT fg.name, p.full_name
    INTO v_group_name, v_creator_name
  FROM public.family_groups fg
  JOIN public.profiles p ON p.id = fg.created_by
  WHERE fg.id = NEW.family_group_id;

  -- Don't notify the creator adding themselves
  IF NEW.user_id = (SELECT created_by FROM public.family_groups WHERE id = NEW.family_group_id) THEN
    RETURN NEW;
  END IF;

  -- Insert notification for the added user
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (
    NEW.user_id,
    '👨‍👩‍👧 Você foi adicionado(a) a uma família!',
    v_creator_name || ' vinculou você ao grupo "' || COALESCE(v_group_name, 'Família') || '".',
    'family',
    jsonb_build_object('family_group_id', NEW.family_group_id)
  );

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_family_group_member_added ON public.family_group_members;
CREATE TRIGGER on_family_group_member_added
  AFTER INSERT ON public.family_group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_added_to_family();

-- Allow authenticated users to insert notifications for others (needed for the trigger SECURITY DEFINER context)
-- The trigger already runs as SECURITY DEFINER so it bypasses RLS, but let's also allow users
-- to query notifications properly (existing policies cover this)
