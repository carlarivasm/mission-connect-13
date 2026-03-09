ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS notify_push boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_24h boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_30min boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_10min boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_5min boolean NOT NULL DEFAULT true;