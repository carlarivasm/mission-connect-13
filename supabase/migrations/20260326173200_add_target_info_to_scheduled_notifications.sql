-- Add target_info JSONB column to store recipient information
ALTER TABLE public.scheduled_notifications
ADD COLUMN IF NOT EXISTS target_info jsonb;
