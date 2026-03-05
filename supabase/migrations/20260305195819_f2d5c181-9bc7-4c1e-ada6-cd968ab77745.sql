
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_reminder_24h boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_reminder_30min boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_reminder_10min boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_reminder_5min boolean NOT NULL DEFAULT true;
