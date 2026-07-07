-- loyalty_tiers (public read; admin can update the seeded rows)
CREATE POLICY loyalty_tiers_select_public ON loyalty_tiers FOR SELECT USING (true);
CREATE POLICY loyalty_tiers_admin_update ON loyalty_tiers FOR UPDATE USING (public.is_admin());

-- loyalty_cards
CREATE POLICY loyalty_cards_select_own ON loyalty_cards FOR SELECT
  USING (customer_id = auth.uid());
CREATE POLICY loyalty_cards_select_staff ON loyalty_cards FOR SELECT
  USING (public.is_staff());

-- loyalty_transactions
CREATE POLICY loyalty_transactions_select_own ON loyalty_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM loyalty_cards lc WHERE lc.id = loyalty_transactions.loyalty_card_id
      AND lc.customer_id = auth.uid()
  ));
CREATE POLICY loyalty_transactions_select_staff ON loyalty_transactions FOR SELECT
  USING (public.is_staff());
