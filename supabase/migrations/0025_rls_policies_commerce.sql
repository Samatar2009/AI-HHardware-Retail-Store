-- discount_codes (any authenticated user can read for validation at checkout)
CREATE POLICY discount_codes_select_authenticated ON discount_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY discount_codes_admin_insert ON discount_codes FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY discount_codes_admin_update ON discount_codes FOR UPDATE USING (public.is_admin());
CREATE POLICY discount_codes_admin_delete ON discount_codes FOR DELETE USING (public.is_admin());

-- orders
CREATE POLICY orders_select_own ON orders FOR SELECT
  USING (customer_id = auth.uid());
CREATE POLICY orders_select_staff_location ON orders FOR SELECT
  USING (public.is_staff() AND location_id = public.user_location_id());
CREATE POLICY orders_select_admin ON orders FOR SELECT
  USING (public.is_admin());
CREATE POLICY orders_insert_own ON orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());
CREATE POLICY orders_update_staff ON orders FOR UPDATE
  USING (public.is_staff() AND location_id = public.user_location_id());
CREATE POLICY orders_update_admin ON orders FOR UPDATE
  USING (public.is_admin());

-- order_items (visibility inherits from the parent order)
CREATE POLICY order_items_select ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_items.order_id
      AND (o.customer_id = auth.uid()
        OR public.is_admin()
        OR (public.is_staff() AND o.location_id = public.user_location_id()))
  ));

-- payment_transactions
CREATE POLICY payment_transactions_select_own ON payment_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders o WHERE o.id = payment_transactions.order_id AND o.customer_id = auth.uid()
  ));
CREATE POLICY payment_transactions_select_staff ON payment_transactions FOR SELECT
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM orders o WHERE o.id = payment_transactions.order_id
      AND public.is_staff() AND o.location_id = public.user_location_id()
  ));
CREATE POLICY payment_transactions_update_staff ON payment_transactions FOR UPDATE
  USING (public.is_staff());
