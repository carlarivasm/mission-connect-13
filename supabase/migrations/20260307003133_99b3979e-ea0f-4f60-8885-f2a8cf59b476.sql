-- Fix: Update SELECT policy for family_group_members
-- Current policy has self-referencing subquery that fails for new group creators
DROP POLICY IF EXISTS "Members can view group members" ON public.family_group_members;

CREATE POLICY "Members can view group members" ON public.family_group_members
FOR SELECT USING (
  user_id = auth.uid()
  OR family_group_id IN (
    SELECT id FROM family_groups WHERE created_by = auth.uid()
  )
  OR family_group_id IN (
    SELECT fgm.family_group_id FROM family_group_members fgm WHERE fgm.user_id = auth.uid()
  )
);