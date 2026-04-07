
-- Add PIX payment config and age thresholds to missoes
ALTER TABLE public.missoes
  ADD COLUMN pix_key text,
  ADD COLUMN pix_qr_url text,
  ADD COLUMN idade_gratuito integer DEFAULT 0,
  ADD COLUMN idade_meia integer DEFAULT 0,
  ADD COLUMN whatsapp_responsavel text;

-- Add payment tracking to missao_inscricoes
ALTER TABLE public.missao_inscricoes
  ADD COLUMN valor_total numeric DEFAULT 0,
  ADD COLUMN comprovante_url text,
  ADD COLUMN pago boolean DEFAULT false;

-- Allow users to update their own inscription (for adding receipt)
CREATE POLICY "Users can update own inscricao"
ON public.missao_inscricoes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
