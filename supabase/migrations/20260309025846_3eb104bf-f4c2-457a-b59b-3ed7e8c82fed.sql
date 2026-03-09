
-- ============================================================
-- FIX: Convert ALL RESTRICTIVE policies to PERMISSIVE (default)
-- FIX: Scope policies to 'authenticated' instead of PUBLIC
-- FIX: Drop exposed "Anyone can check authorization" policy
-- ============================================================

-- ==================== app_settings ====================
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;

CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view app settings" ON public.app_settings FOR SELECT TO authenticated USING (true);

-- ==================== authorized_missionaries ====================
DROP POLICY IF EXISTS "Anyone can check authorization" ON public.authorized_missionaries;
DROP POLICY IF EXISTS "Admins can delete authorized missionaries" ON public.authorized_missionaries;
DROP POLICY IF EXISTS "Admins can insert authorized missionaries" ON public.authorized_missionaries;
DROP POLICY IF EXISTS "Admins can manage authorized missionaries" ON public.authorized_missionaries;
DROP POLICY IF EXISTS "Admins can update authorized missionaries" ON public.authorized_missionaries;
DROP POLICY IF EXISTS "Admins can view authorized missionaries" ON public.authorized_missionaries;

CREATE POLICY "Admins can manage authorized missionaries" ON public.authorized_missionaries FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== events ====================
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
DROP POLICY IF EXISTS "Authenticated can view events" ON public.events;

CREATE POLICY "Admins can manage events" ON public.events FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view events" ON public.events FOR SELECT TO authenticated USING (true);

-- ==================== family_group_members ====================
DROP POLICY IF EXISTS "Admins can manage family group members" ON public.family_group_members;
DROP POLICY IF EXISTS "Group creator can delete members" ON public.family_group_members;
DROP POLICY IF EXISTS "Group creator can insert members" ON public.family_group_members;
DROP POLICY IF EXISTS "Members can view group members" ON public.family_group_members;

CREATE POLICY "Admins can manage family group members" ON public.family_group_members FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can view group members" ON public.family_group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR family_group_id IN (SELECT id FROM family_groups WHERE created_by = auth.uid()) OR family_group_id IN (SELECT fgm.family_group_id FROM family_group_members fgm WHERE fgm.user_id = auth.uid()));
CREATE POLICY "Group creator can insert members" ON public.family_group_members FOR INSERT TO authenticated
  WITH CHECK (family_group_id IN (SELECT id FROM family_groups WHERE created_by = auth.uid()));
CREATE POLICY "Group creator can delete members" ON public.family_group_members FOR DELETE TO authenticated
  USING (family_group_id IN (SELECT id FROM family_groups WHERE created_by = auth.uid()) OR user_id = auth.uid());

-- ==================== family_groups ====================
DROP POLICY IF EXISTS "Admins can manage family groups" ON public.family_groups;
DROP POLICY IF EXISTS "Creator can delete family group" ON public.family_groups;
DROP POLICY IF EXISTS "Creator can update family group" ON public.family_groups;
DROP POLICY IF EXISTS "Creator can view own family group" ON public.family_groups;
DROP POLICY IF EXISTS "Members can view their family group" ON public.family_groups;
DROP POLICY IF EXISTS "Users can create family groups" ON public.family_groups;

CREATE POLICY "Admins can manage family groups" ON public.family_groups FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Creator can view own family group" ON public.family_groups FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Members can view their family group" ON public.family_groups FOR SELECT TO authenticated USING (id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can create family groups" ON public.family_groups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creator can update family group" ON public.family_groups FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Creator can delete family group" ON public.family_groups FOR DELETE TO authenticated USING (created_by = auth.uid());

-- ==================== fcm_tokens ====================
DROP POLICY IF EXISTS "Service role can read all tokens" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Users can manage own tokens" ON public.fcm_tokens;

CREATE POLICY "Users can manage own tokens" ON public.fcm_tokens FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can read all tokens" ON public.fcm_tokens FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== formation_categories ====================
DROP POLICY IF EXISTS "Admins can manage formation categories" ON public.formation_categories;
DROP POLICY IF EXISTS "Authenticated can view formation categories" ON public.formation_categories;

CREATE POLICY "Admins can manage formation categories" ON public.formation_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view formation categories" ON public.formation_categories FOR SELECT TO authenticated USING (true);

-- ==================== formation_videos ====================
DROP POLICY IF EXISTS "Admins can manage formation videos" ON public.formation_videos;
DROP POLICY IF EXISTS "Authenticated can view formation videos" ON public.formation_videos;

CREATE POLICY "Admins can manage formation videos" ON public.formation_videos FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view formation videos" ON public.formation_videos FOR SELECT TO authenticated USING (true);

-- ==================== gallery_photos ====================
DROP POLICY IF EXISTS "Authenticated can upload photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Authenticated can view photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON public.gallery_photos;

CREATE POLICY "Authenticated can view photos" ON public.gallery_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can upload photos" ON public.gallery_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete own photos" ON public.gallery_photos FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- ==================== location_user_notes ====================
DROP POLICY IF EXISTS "Admins can manage all location notes" ON public.location_user_notes;
DROP POLICY IF EXISTS "Users can insert own location notes" ON public.location_user_notes;
DROP POLICY IF EXISTS "Users can update own location notes" ON public.location_user_notes;
DROP POLICY IF EXISTS "Users can view own location notes" ON public.location_user_notes;

CREATE POLICY "Admins can manage all location notes" ON public.location_user_notes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own location notes" ON public.location_user_notes FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own location notes" ON public.location_user_notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own location notes" ON public.location_user_notes FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ==================== materials ====================
DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated can view materials" ON public.materials;

CREATE POLICY "Admins can manage materials" ON public.materials FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view materials" ON public.materials FOR SELECT TO authenticated USING (true);

-- ==================== mission_locations ====================
DROP POLICY IF EXISTS "Admins can manage locations" ON public.mission_locations;
DROP POLICY IF EXISTS "Authenticated can view locations" ON public.mission_locations;

CREATE POLICY "Admins can manage locations" ON public.mission_locations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view locations" ON public.mission_locations FOR SELECT TO authenticated USING (true);

-- ==================== notifications ====================
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "Admins can manage all notifications" ON public.notifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ==================== order_items ====================
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;

CREATE POLICY "Admins can manage all order items" ON public.order_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT TO authenticated USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

-- ==================== orders ====================
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;

CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ==================== org_positions ====================
DROP POLICY IF EXISTS "Admins can manage org positions" ON public.org_positions;
DROP POLICY IF EXISTS "Authenticated can view org positions" ON public.org_positions;

CREATE POLICY "Admins can manage org positions" ON public.org_positions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view org positions" ON public.org_positions FOR SELECT TO authenticated USING (true);

-- ==================== profiles ====================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- ==================== store_products ====================
DROP POLICY IF EXISTS "Admins can manage products" ON public.store_products;
DROP POLICY IF EXISTS "Authenticated can view products" ON public.store_products;

CREATE POLICY "Admins can manage products" ON public.store_products FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view products" ON public.store_products FOR SELECT TO authenticated USING (true);

-- ==================== survey_options ====================
DROP POLICY IF EXISTS "Admins can manage options" ON public.survey_options;
DROP POLICY IF EXISTS "Authenticated can view options" ON public.survey_options;

CREATE POLICY "Admins can manage options" ON public.survey_options FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view options" ON public.survey_options FOR SELECT TO authenticated USING (true);

-- ==================== survey_questions ====================
DROP POLICY IF EXISTS "Admins can manage questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Authenticated can view questions" ON public.survey_questions;

CREATE POLICY "Admins can manage questions" ON public.survey_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view questions" ON public.survey_questions FOR SELECT TO authenticated USING (true);

-- ==================== survey_responses ====================
DROP POLICY IF EXISTS "Admins can manage responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can insert own responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can view own responses" ON public.survey_responses;

CREATE POLICY "Admins can manage responses" ON public.survey_responses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own responses" ON public.survey_responses FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own responses" ON public.survey_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==================== surveys ====================
DROP POLICY IF EXISTS "Admins can manage surveys" ON public.surveys;
DROP POLICY IF EXISTS "Authenticated can view active surveys" ON public.surveys;

CREATE POLICY "Admins can manage surveys" ON public.surveys FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view active surveys" ON public.surveys FOR SELECT TO authenticated USING (active = true OR has_role(auth.uid(), 'admin'::app_role));

-- ==================== user_roles ====================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
