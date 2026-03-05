
-- Family groups system
CREATE TABLE public.family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.family_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id uuid NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(family_group_id, user_id)
);

ALTER TABLE public.family_group_members ENABLE ROW LEVEL SECURITY;

-- RLS for family_groups: members can view, creator can manage
CREATE POLICY "Members can view their family group"
ON public.family_groups FOR SELECT
TO authenticated
USING (id IN (SELECT family_group_id FROM public.family_group_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create family groups"
ON public.family_groups FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can update family group"
ON public.family_groups FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Creator can delete family group"
ON public.family_groups FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- RLS for family_group_members
CREATE POLICY "Members can view group members"
ON public.family_group_members FOR SELECT
TO authenticated
USING (family_group_id IN (SELECT family_group_id FROM public.family_group_members fgm WHERE fgm.user_id = auth.uid()));

CREATE POLICY "Group creator can insert members"
ON public.family_group_members FOR INSERT
TO authenticated
WITH CHECK (family_group_id IN (SELECT id FROM public.family_groups WHERE created_by = auth.uid()));

CREATE POLICY "Group creator can delete members"
ON public.family_group_members FOR DELETE
TO authenticated
USING (family_group_id IN (SELECT id FROM public.family_groups WHERE created_by = auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Admins can manage family groups"
ON public.family_groups FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage family group members"
ON public.family_group_members FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for material documents
INSERT INTO storage.buckets (id, name, public) VALUES ('material-documents', 'material-documents', true);

CREATE POLICY "Admins can upload material documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'material-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view material documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'material-documents');

CREATE POLICY "Admins can delete material documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'material-documents' AND public.has_role(auth.uid(), 'admin'));
