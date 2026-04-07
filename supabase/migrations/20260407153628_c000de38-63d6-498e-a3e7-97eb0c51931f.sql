
-- Add multiple dates array and price to missions
ALTER TABLE public.missoes
  ADD COLUMN IF NOT EXISTS datas date[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS valor numeric DEFAULT NULL;

-- Add email and chosen dates to inscriptions
ALTER TABLE public.missao_inscricoes
  ADD COLUMN IF NOT EXISTS email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS datas_escolhidas date[] NOT NULL DEFAULT '{}';

-- Backfill existing missions: copy single data into datas array
UPDATE public.missoes SET datas = ARRAY[data] WHERE datas = '{}';
