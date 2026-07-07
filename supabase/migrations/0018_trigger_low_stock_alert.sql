CREATE OR REPLACE FUNCTION trg_check_low_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  _alert_type TEXT;
BEGIN
  IF NEW.quantity_on_hand <= NEW.threshold THEN
    _alert_type := CASE WHEN NEW.quantity_on_hand = 0 THEN 'out_of_stock' ELSE 'low_stock' END;

    IF NOT EXISTS (
      SELECT 1 FROM inventory_alerts
      WHERE product_id = NEW.product_id
        AND (variant_id = NEW.variant_id OR (variant_id IS NULL AND NEW.variant_id IS NULL))
        AND location_id = NEW.location_id
        AND is_resolved = false
    ) THEN
      INSERT INTO inventory_alerts (product_id, variant_id, location_id, alert_type)
      VALUES (NEW.product_id, NEW.variant_id, NEW.location_id, _alert_type);
    END IF;
  ELSE
    UPDATE inventory_alerts
    SET is_resolved = true, resolved_at = now()
    WHERE product_id = NEW.product_id
      AND (variant_id = NEW.variant_id OR (variant_id IS NULL AND NEW.variant_id IS NULL))
      AND location_id = NEW.location_id
      AND is_resolved = false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_low_stock
  AFTER UPDATE OF quantity_on_hand ON inventory
  FOR EACH ROW EXECUTE FUNCTION trg_check_low_stock();
