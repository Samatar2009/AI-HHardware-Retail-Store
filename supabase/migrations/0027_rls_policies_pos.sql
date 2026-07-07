-- pos_sessions
CREATE POLICY pos_sessions_select_own ON pos_sessions FOR SELECT
  USING (cashier_id = auth.uid());
CREATE POLICY pos_sessions_select_admin ON pos_sessions FOR SELECT
  USING (public.is_admin());
CREATE POLICY pos_sessions_insert_own ON pos_sessions FOR INSERT
  WITH CHECK (cashier_id = auth.uid());
CREATE POLICY pos_sessions_update_own ON pos_sessions FOR UPDATE
  USING (cashier_id = auth.uid());
CREATE POLICY pos_sessions_update_admin ON pos_sessions FOR UPDATE
  USING (public.is_admin());

-- pos_transactions
CREATE POLICY pos_transactions_select_own_session ON pos_transactions FOR SELECT
  USING (cashier_id = auth.uid());
CREATE POLICY pos_transactions_select_staff_location ON pos_transactions FOR SELECT
  USING (public.is_staff() AND location_id = public.user_location_id());
CREATE POLICY pos_transactions_select_admin ON pos_transactions FOR SELECT
  USING (public.is_admin());
CREATE POLICY pos_transactions_insert_own_session ON pos_transactions FOR INSERT
  WITH CHECK (cashier_id = auth.uid());
CREATE POLICY pos_transactions_void_staff ON pos_transactions FOR UPDATE
  USING (public.user_role() IN ('admin','inventory_manager'));

-- pos_transaction_items (visibility inherits from parent transaction)
CREATE POLICY pos_transaction_items_select ON pos_transaction_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM pos_transactions pt WHERE pt.id = pos_transaction_items.pos_transaction_id
      AND (pt.cashier_id = auth.uid() OR public.is_admin()
        OR (public.is_staff() AND pt.location_id = public.user_location_id()))
  ));
CREATE POLICY pos_transaction_items_insert ON pos_transaction_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM pos_transactions pt WHERE pt.id = pos_transaction_items.pos_transaction_id
      AND pt.cashier_id = auth.uid()
  ));

-- pos_payment_splits
CREATE POLICY pos_payment_splits_select ON pos_payment_splits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM pos_transactions pt WHERE pt.id = pos_payment_splits.pos_transaction_id
      AND (pt.cashier_id = auth.uid() OR public.is_admin()
        OR (public.is_staff() AND pt.location_id = public.user_location_id()))
  ));
CREATE POLICY pos_payment_splits_insert ON pos_payment_splits FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM pos_transactions pt WHERE pt.id = pos_payment_splits.pos_transaction_id
      AND pt.cashier_id = auth.uid()
  ));
CREATE POLICY pos_payment_splits_confirm ON pos_payment_splits FOR UPDATE
  USING (public.is_staff());

-- parked_transactions
CREATE POLICY parked_transactions_select_own ON parked_transactions FOR SELECT
  USING (cashier_id = auth.uid());
CREATE POLICY parked_transactions_select_admin ON parked_transactions FOR SELECT
  USING (public.is_admin());
CREATE POLICY parked_transactions_insert_own ON parked_transactions FOR INSERT
  WITH CHECK (cashier_id = auth.uid());
CREATE POLICY parked_transactions_update_own ON parked_transactions FOR UPDATE
  USING (cashier_id = auth.uid());
CREATE POLICY parked_transactions_delete_own ON parked_transactions FOR DELETE
  USING (cashier_id = auth.uid());
CREATE POLICY parked_transactions_delete_admin ON parked_transactions FOR DELETE
  USING (public.is_admin());
