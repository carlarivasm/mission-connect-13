
-- Fix: Allow creators to SELECT their own family group (needed for .insert().select())
CREATE POLICY "Creator can view own family group"
ON public.family_groups
FOR SELECT
TO authenticated
USING (created_by = auth.uid());
