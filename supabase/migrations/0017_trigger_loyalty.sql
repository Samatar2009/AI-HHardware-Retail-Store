-- Create a loyalty card automatically for every new customer profile
CREATE SEQUENCE IF NOT EXISTS loyalty_card_seq START 1;

CREATE OR REPLACE FUNCTION trg_create_loyalty_card()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role = 'customer' THEN
    INSERT INTO loyalty_cards (customer_id, card_number)
    VALUES (NEW.user_id, 'BH-LC-' || lpad(nextval('loyalty_card_seq')::text, 6, '0'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_loyalty_card
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION trg_create_loyalty_card();

-- Award loyalty points on order/POS completion (1 point per 1000 SLSH spent)
CREATE OR REPLACE FUNCTION trg_award_loyalty_points()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  _points INTEGER;
  _card_id UUID;
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status != 'completed') THEN
    _points := floor(NEW.total_slsh / 1000)::INTEGER;
    IF _points > 0 AND NEW.customer_id IS NOT NULL THEN
      SELECT id INTO _card_id FROM loyalty_cards WHERE customer_id = NEW.customer_id;
      IF FOUND THEN
        UPDATE loyalty_cards
        SET current_points = current_points + _points,
            lifetime_points = lifetime_points + _points,
            current_tier = calculate_loyalty_tier(lifetime_points + _points),
            updated_at = now()
        WHERE id = _card_id;

        INSERT INTO loyalty_transactions
          (loyalty_card_id, transaction_type, points, reference_type, reference_id)
        VALUES (_card_id, 'earn', _points, TG_TABLE_NAME, NEW.id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER award_loyalty_order
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_award_loyalty_points();

CREATE TRIGGER award_loyalty_pos
  AFTER INSERT ON pos_transactions
  FOR EACH ROW EXECUTE FUNCTION trg_award_loyalty_points();
