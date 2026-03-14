
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS material_type text NOT NULL DEFAULT 'document';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS storage_path text;
UPDATE public.materials SET category = 'outros_responsaveis' WHERE category = 'responsaveis';
