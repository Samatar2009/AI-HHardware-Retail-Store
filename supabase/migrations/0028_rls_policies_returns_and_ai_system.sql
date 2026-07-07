-- returns
CREATE POLICY returns_select_own ON returns FOR SELECT
  USING (customer_id = auth.uid());
CREATE POLICY returns_select_staff_location ON returns FOR SELECT
  USING (public.is_staff() AND location_id = public.user_location_id());
CREATE POLICY returns_select_admin ON returns FOR SELECT
  USING (public.is_admin());
CREATE POLICY returns_insert_own ON returns FOR INSERT
  WITH CHECK (customer_id = auth.uid());
CREATE POLICY returns_update_staff ON returns FOR UPDATE
  USING (public.is_staff() AND location_id = public.user_location_id());
CREATE POLICY returns_update_admin ON returns FOR UPDATE
  USING (public.is_admin());

-- return_items (visibility inherits from parent return)
CREATE POLICY return_items_select ON return_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM returns r WHERE r.id = return_items.return_id
      AND (r.customer_id = auth.uid() OR public.is_admin()
        OR (public.is_staff() AND r.location_id = public.user_location_id()))
  ));
CREATE POLICY return_items_insert ON return_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM returns r WHERE r.id = return_items.return_id AND r.customer_id = auth.uid()
  ));

-- ai_forecasts (inventory_manager/admin, own location)
CREATE POLICY ai_forecasts_select_own_location ON ai_forecasts FOR SELECT
  USING (public.is_admin() OR
    (public.user_role() = 'inventory_manager' AND location_id = public.user_location_id()));

-- audit_log (admin read only; writes are trigger/service-role only)
CREATE POLICY audit_log_select_admin ON audit_log FOR SELECT
  USING (public.is_admin());

-- sms_logs (admin read only; writes are service-role only)
CREATE POLICY sms_logs_select_admin ON sms_logs FOR SELECT
  USING (public.is_admin());
