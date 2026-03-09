
-- Drop all restrictive policies on family_groups and recreate as permissive

DROP POLICY IF EXISTS "Admins can manage family groups" ON public.family_groups;
DROP POLICY IF EXISTS "Creator can delete family group" ON public.family_groups;
DROP POLICY IF EXISTS "Creator can update family group" ON public.family_groups;
DROP POLICY IF EXISTS "Creator can view own family group" ON public.family_groups;
DROP POLICY IF EXISTS "Members can view their family group" ON public.family_groups;
DROP POLICY IF EXISTS "Users can create family groups" ON public.family_groups;

CREATE POLICY "Admins can manage family groups" ON public.family_groups
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creator can delete family group" ON public.family_groups
  FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Creator can update family group" ON public.family_groups
  FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Creator can view own family group" ON public.family_groups
  FOR SELECT TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Members can view their family group" ON public.family_groups
  FOR SELECT TO authenticated USING (id IN (SELECT family_group_members.family_group_id FROM family_group_members WHERE family_group_members.user_id = auth.uid()));

CREATE POLICY "Users can create family groups" ON public.family_groups
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Drop all restrictive policies on family_group_members and recreate as permissive

DROP POLICY IF EXISTS "Admins can manage family group members" ON public.family_group_members;
DROP POLICY IF EXISTS "Group creator can delete members" ON public.family_group_members;
DROP POLICY IF EXISTS "Group creator can insert members" ON public.family_group_members;
DROP POLICY IF EXISTS "Members can view group members" ON public.family_group_members;

CREATE POLICY "Admins can manage family group members" ON public.family_group_members
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Group creator can delete members" ON public.family_group_members
  FOR DELETE TO authenticated USING ((family_group_id IN (SELECT family_groups.id FROM family_groups WHERE family_groups.created_by = auth.uid())) OR (user_id = auth.uid()));

CREATE POLICY "Group creator can insert members" ON public.family_group_members
  FOR INSERT TO authenticated WITH CHECK (family_group_id IN (SELECT family_groups.id FROM family_groups WHERE family_groups.created_by = auth.uid()));

CREATE POLICY "Members can view group members" ON public.family_group_members
  FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR (family_group_id IN (SELECT family_groups.id FROM family_groups WHERE family_groups.created_by = auth.uid())) OR (family_group_id IN (SELECT fgm.family_group_id FROM family_group_members fgm WHERE fgm.user_id = auth.uid())));
