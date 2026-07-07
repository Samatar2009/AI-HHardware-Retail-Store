-- profiles
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY profiles_select_staff_same_location ON profiles FOR SELECT
  USING (public.is_staff() AND location_id = public.user_location_id());
CREATE POLICY profiles_select_admin ON profiles FOR SELECT
  USING (public.is_admin());
CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY profiles_update_admin ON profiles FOR UPDATE
  USING (public.is_admin());
CREATE POLICY profiles_delete_admin ON profiles FOR DELETE
  USING (public.is_admin());

-- locations (public read, admin write)
CREATE POLICY locations_select_public ON locations FOR SELECT USING (true);
CREATE POLICY locations_admin_insert ON locations FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY locations_admin_update ON locations FOR UPDATE USING (public.is_admin());
CREATE POLICY locations_admin_delete ON locations FOR DELETE USING (public.is_admin());

-- location_hours
CREATE POLICY location_hours_select_public ON location_hours FOR SELECT USING (true);
CREATE POLICY location_hours_admin_insert ON location_hours FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY location_hours_admin_update ON location_hours FOR UPDATE USING (public.is_admin());
CREATE POLICY location_hours_admin_delete ON location_hours FOR DELETE USING (public.is_admin());

-- exchange_rates (public read, admin insert only — never updated/deleted)
CREATE POLICY exchange_rates_select_public ON exchange_rates FOR SELECT USING (true);
CREATE POLICY exchange_rates_admin_insert ON exchange_rates FOR INSERT WITH CHECK (public.is_admin());

-- mobile_money_settings
CREATE POLICY mobile_money_settings_select_authenticated ON mobile_money_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY mobile_money_settings_admin_insert ON mobile_money_settings FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY mobile_money_settings_admin_update ON mobile_money_settings FOR UPDATE USING (public.is_admin());
CREATE POLICY mobile_money_settings_admin_delete ON mobile_money_settings FOR DELETE USING (public.is_admin());

-- banners (public read, admin write)
CREATE POLICY banners_select_public ON banners FOR SELECT USING (true);
CREATE POLICY banners_admin_insert ON banners FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY banners_admin_update ON banners FOR UPDATE USING (public.is_admin());
CREATE POLICY banners_admin_delete ON banners FOR DELETE USING (public.is_admin());
