
-- Create security definer function to check family group membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_family_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_group_members
    WHERE user_id = _user_id AND family_group_id = _group_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_family_group_creator(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_groups
    WHERE id = _group_id AND created_by = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_family_group_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_group_id FROM public.family_group_members WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_created_family_group_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.family_groups WHERE created_by = _user_id
$$;

-- Recreate family_groups policies using security definer functions
DROP POLICY IF EXISTS "Admins can manage family groups" ON public.family_groups;
DROP POLICY IF EXISTS "Creator can delete family group" ON public.family_groups;
DROP POLICY IF EXISTS "Creator can update family group" ON public.family_groups;
DROP POLICY IF EXISTS "Creator can view own family group" ON public.family_groups;
DROP POLICY IF EXISTS "Members can view their family group" ON public.family_groups;
DROP POLICY IF EXISTS "Users can create family groups" ON public.family_groups;

CREATE POLICY "Admins can manage family groups" ON public.family_groups
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creator can manage own family group" ON public.family_groups
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Members can view their family group" ON public.family_groups
  FOR SELECT TO authenticated
  USING (is_family_group_member(auth.uid(), id));

-- Recreate family_group_members policies using security definer functions
DROP POLICY IF EXISTS "Admins can manage family group members" ON public.family_group_members;
DROP POLICY IF EXISTS "Group creator can delete members" ON public.family_group_members;
DROP POLICY IF EXISTS "Group creator can insert members" ON public.family_group_members;
DROP POLICY IF EXISTS "Members can view group members" ON public.family_group_members;

CREATE POLICY "Admins can manage family group members" ON public.family_group_members
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view group members" ON public.family_group_members
  FOR SELECT TO authenticated
  USING (family_group_id IN (SELECT get_user_family_group_ids(auth.uid())));

CREATE POLICY "Group creator can insert members" ON public.family_group_members
  FOR INSERT TO authenticated
  WITH CHECK (family_group_id IN (SELECT get_created_family_group_ids(auth.uid())));

CREATE POLICY "Group creator can delete members" ON public.family_group_members
  FOR DELETE TO authenticated
  USING ((family_group_id IN (SELECT get_created_family_group_ids(auth.uid()))) OR (user_id = auth.uid()));
