-- Reserve inventory when an order is placed (raises if insufficient stock)
CREATE OR REPLACE FUNCTION trg_reserve_inventory()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM order_items oi
    JOIN inventory i ON i.product_id = oi.product_id
      AND (i.variant_id = oi.variant_id OR (i.variant_id IS NULL AND oi.variant_id IS NULL))
      AND i.location_id = NEW.location_id
    WHERE oi.order_id = NEW.id
      AND (i.quantity_on_hand - i.quantity_reserved) < oi.quantity
  ) THEN
    RAISE EXCEPTION 'Insufficient stock for one or more items';
  END IF;

  UPDATE inventory i
  SET quantity_reserved = quantity_reserved + oi.quantity,
      updated_at = now()
  FROM order_items oi
  WHERE oi.order_id = NEW.id
    AND i.product_id = oi.product_id
    AND (i.variant_id = oi.variant_id OR (i.variant_id IS NULL AND oi.variant_id IS NULL))
    AND i.location_id = NEW.location_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reserve_inventory
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_reserve_inventory();

-- Confirm inventory (decrement on_hand, release reservation) when payment confirmed
CREATE OR REPLACE FUNCTION trg_confirm_inventory()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'payment_confirmed' AND OLD.status != 'payment_confirmed' THEN
    UPDATE inventory i
    SET quantity_on_hand = quantity_on_hand - oi.quantity,
        quantity_reserved = GREATEST(0, quantity_reserved - oi.quantity),
        updated_at = now()
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND i.product_id = oi.product_id
      AND (i.variant_id = oi.variant_id OR (i.variant_id IS NULL AND oi.variant_id IS NULL))
      AND i.location_id = NEW.location_id;

    INSERT INTO stock_movements
      (product_id, variant_id, location_id, movement_type, quantity_change, reference_id, reference_type, performed_by)
    SELECT oi.product_id, oi.variant_id, NEW.location_id, 'sale', -oi.quantity, NEW.id, 'order', NEW.customer_id
    FROM order_items oi WHERE oi.order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER confirm_inventory
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_confirm_inventory();

-- Release reservation when an order is cancelled before payment was confirmed
CREATE OR REPLACE FUNCTION trg_release_reservation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status NOT IN ('cancelled','payment_confirmed','completed') THEN
    UPDATE inventory i
    SET quantity_reserved = GREATEST(0, quantity_reserved - oi.quantity),
        updated_at = now()
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND i.product_id = oi.product_id
      AND (i.variant_id = oi.variant_id OR (i.variant_id IS NULL AND oi.variant_id IS NULL))
      AND i.location_id = NEW.location_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER release_reservation
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_release_reservation();
