-- inventory (available quantity is public info for stock-status display)
CREATE POLICY inventory_select_public ON inventory FOR SELECT USING (true);
CREATE POLICY inventory_staff_insert ON inventory FOR INSERT
  WITH CHECK (public.user_role() IN ('admin','inventory_manager'));
CREATE POLICY inventory_manager_update_own_location ON inventory FOR UPDATE
  USING (public.user_role() = 'inventory_manager' AND location_id = public.user_location_id());
CREATE POLICY inventory_admin_update_any ON inventory FOR UPDATE
  USING (public.is_admin());

-- stock_movements (immutable ledger)
CREATE POLICY stock_movements_select_staff_own_location ON stock_movements FOR SELECT
  USING (public.is_staff() AND location_id = public.user_location_id());
CREATE POLICY stock_movements_select_admin ON stock_movements FOR SELECT
  USING (public.is_admin());

-- inventory_alerts
CREATE POLICY inventory_alerts_select_own_location ON inventory_alerts FOR SELECT
  USING (public.user_role() IN ('admin','inventory_manager') AND
    (public.is_admin() OR location_id = public.user_location_id()));
CREATE POLICY inventory_alerts_resolve ON inventory_alerts FOR UPDATE
  USING (public.is_staff());

-- stocktakes
CREATE POLICY stocktakes_select_own_location ON stocktakes FOR SELECT
  USING (public.is_admin() OR
    (public.user_role() = 'inventory_manager' AND location_id = public.user_location_id()));
CREATE POLICY stocktakes_insert_own_location ON stocktakes FOR INSERT
  WITH CHECK (public.is_admin() OR
    (public.user_role() = 'inventory_manager' AND location_id = public.user_location_id()));
CREATE POLICY stocktakes_update_own_location ON stocktakes FOR UPDATE
  USING (public.is_admin() OR
    (public.user_role() = 'inventory_manager' AND location_id = public.user_location_id()));

-- stocktake_items (same access as parent stocktake)
CREATE POLICY stocktake_items_select ON stocktake_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stocktakes s WHERE s.id = stocktake_items.stocktake_id
      AND (public.is_admin() OR
        (public.user_role() = 'inventory_manager' AND s.location_id = public.user_location_id()))
  ));
CREATE POLICY stocktake_items_insert ON stocktake_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM stocktakes s WHERE s.id = stocktake_items.stocktake_id
      AND (public.is_admin() OR
        (public.user_role() = 'inventory_manager' AND s.location_id = public.user_location_id()))
  ));
CREATE POLICY stocktake_items_update ON stocktake_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM stocktakes s WHERE s.id = stocktake_items.stocktake_id
      AND (public.is_admin() OR
        (public.user_role() = 'inventory_manager' AND s.location_id = public.user_location_id()))
  ));
