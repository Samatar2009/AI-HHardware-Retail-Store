-- Atomic order creation for Phase 6 Step 6.2. Wraps stock validation
-- (via the reserve_inventory trigger on order_items, which now fires
-- correctly per migration 0036), discount code application, loyalty
-- point redemption, exchange rate snapshot, and pickup code generation
-- in a single transaction — any failure (e.g. insufficient stock) rolls
-- back the whole order rather than leaving an orphaned row.
CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_id uuid,
  p_location_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_discount_code text DEFAULT NULL,
  p_redeem_loyalty boolean DEFAULT false,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (order_id uuid, order_number text, pickup_code text, total_slsh bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _order_id uuid;
  _subtotal bigint := 0;
  _discount_amount bigint := 0;
  _discount_code_id uuid;
  _loyalty_discount bigint := 0;
  _loyalty_points_redeemed integer := 0;
  _exchange_rate numeric;
  _pickup_code text;
  _item jsonb;
  _unit_price bigint;
  _product_name_en text;
  _product_name_so text;
  _sku text;
  _card_id uuid;
  _current_points integer;
  _current_tier text;
  _tier_discount_pct numeric;
  _discount_check RECORD;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot place an order with no items';
  END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT price_slsh INTO _unit_price
    FROM product_variants
    WHERE id = (_item->>'variant_id')::uuid
      AND product_id = (_item->>'product_id')::uuid
      AND is_active = true;

    IF _unit_price IS NULL THEN
      RAISE EXCEPTION 'One or more items are no longer available';
    END IF;

    _subtotal := _subtotal + (_unit_price * (_item->>'quantity')::integer);
  END LOOP;

  IF p_discount_code IS NOT NULL THEN
    SELECT * INTO _discount_check FROM check_discount_code_validity(p_discount_code, p_customer_id, _subtotal);
    IF NOT _discount_check.is_valid THEN
      RAISE EXCEPTION '%', _discount_check.error_message;
    END IF;
    _discount_amount := _discount_check.discount_amount_slsh;
    SELECT id INTO _discount_code_id FROM discount_codes WHERE upper(code) = upper(p_discount_code);
  END IF;

  IF p_redeem_loyalty THEN
    SELECT id, current_points, current_tier INTO _card_id, _current_points, _current_tier
    FROM loyalty_cards WHERE customer_id = p_customer_id;

    IF _card_id IS NOT NULL AND _current_points >= 100 THEN
      SELECT discount_percentage INTO _tier_discount_pct FROM loyalty_tiers WHERE tier_name = _current_tier;
      _loyalty_discount := floor(_subtotal * _tier_discount_pct / 100);
      _loyalty_points_redeemed := _current_points;
    END IF;
  END IF;

  SELECT usd_to_slsh_rate INTO _exchange_rate FROM exchange_rates ORDER BY created_at DESC LIMIT 1;
  _pickup_code := generate_pickup_code();

  INSERT INTO orders (
    customer_id, location_id, subtotal_slsh, discount_amount_slsh, discount_code_id,
    loyalty_discount_slsh, loyalty_points_redeemed, total_slsh, payment_method,
    exchange_rate_at_order, pickup_code, notes, status, payment_status
  ) VALUES (
    p_customer_id, p_location_id, _subtotal, _discount_amount, _discount_code_id,
    _loyalty_discount, _loyalty_points_redeemed,
    GREATEST(0, _subtotal - _discount_amount - _loyalty_discount),
    p_payment_method, _exchange_rate, _pickup_code, p_notes, 'pending_payment', 'pending'
  ) RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT pv.price_slsh, p.name_en, p.name_so, pv.sku
    INTO _unit_price, _product_name_en, _product_name_so, _sku
    FROM product_variants pv JOIN products p ON p.id = pv.product_id
    WHERE pv.id = (_item->>'variant_id')::uuid;

    -- Insert fires the reserve_inventory trigger, which raises (rolling
    -- back this whole function) if stock is insufficient.
    INSERT INTO order_items (
      order_id, product_id, variant_id, product_name_en, product_name_so, sku,
      quantity, unit_price_slsh, total_price_slsh
    ) VALUES (
      _order_id, (_item->>'product_id')::uuid, (_item->>'variant_id')::uuid,
      _product_name_en, _product_name_so, _sku,
      (_item->>'quantity')::integer, _unit_price, _unit_price * (_item->>'quantity')::integer
    );
  END LOOP;

  IF _discount_code_id IS NOT NULL THEN
    INSERT INTO discount_code_uses (discount_code_id, customer_id, order_id)
    VALUES (_discount_code_id, p_customer_id, _order_id);
    UPDATE discount_codes SET uses_count = uses_count + 1 WHERE id = _discount_code_id;
  END IF;

  IF _loyalty_points_redeemed > 0 THEN
    UPDATE loyalty_cards SET current_points = current_points - _loyalty_points_redeemed, updated_at = now()
    WHERE id = _card_id;
    INSERT INTO loyalty_transactions (loyalty_card_id, transaction_type, points, reference_type, reference_id)
    VALUES (_card_id, 'redeem', -_loyalty_points_redeemed, 'order', _order_id);
  END IF;

  RETURN QUERY
    SELECT o.id, o.order_number, o.pickup_code, o.total_slsh FROM orders o WHERE o.id = _order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order(uuid, uuid, jsonb, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, uuid, jsonb, text, text, boolean, text) TO authenticated, postgres, service_role;
