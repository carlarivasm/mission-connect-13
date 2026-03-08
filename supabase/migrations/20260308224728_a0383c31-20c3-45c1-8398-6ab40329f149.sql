
-- Drop the unique constraint on (location_id, user_id) to allow multiple notes per location per user
ALTER TABLE public.location_user_notes DROP CONSTRAINT IF EXISTS location_user_notes_location_id_user_id_key;
