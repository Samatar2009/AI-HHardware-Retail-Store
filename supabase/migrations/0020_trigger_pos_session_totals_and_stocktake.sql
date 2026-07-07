-- Keep pos_sessions running totals in sync with its transactions
CREATE OR REPLACE FUNCTION trg_update_session_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE pos_sessions
  SET total_sales_slsh = (
        SELECT COALESCE(SUM(total_slsh),0) FROM pos_transactions
        WHERE pos_session_id = NEW.pos_session_id AND status = 'completed'
      ),
      total_cash_sales_slsh = (
        SELECT COALESCE(SUM(pps.amount_slsh),0)
        FROM pos_transactions pt
        JOIN pos_payment_splits pps ON pps.pos_transaction_id = pt.id
        WHERE pt.pos_session_id = NEW.pos_session_id
          AND pt.status = 'completed'
          AND pps.payment_method = 'cash'
      ),
      total_voids_slsh = (
        SELECT COALESCE(SUM(total_slsh),0) FROM pos_transactions
        WHERE pos_session_id = NEW.pos_session_id AND status = 'voided'
      )
  WHERE id = NEW.pos_session_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_session_totals
  AFTER INSERT OR UPDATE OF status ON pos_transactions
  FOR EACH ROW EXECUTE FUNCTION trg_update_session_totals();

-- Apply stocktake corrections to inventory once an admin approves it
CREATE OR REPLACE FUNCTION trg_apply_stocktake()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE inventory i
    SET quantity_on_hand = si.counted_quantity, updated_at = now()
    FROM stocktake_items si
    WHERE si.stocktake_id = NEW.id
      AND i.product_id = si.product_id
      AND (i.variant_id = si.variant_id OR (i.variant_id IS NULL AND si.variant_id IS NULL))
      AND i.location_id = NEW.location_id;

    INSERT INTO stock_movements
      (product_id, variant_id, location_id, movement_type, quantity_change, reference_id, reference_type, performed_by)
    SELECT si.product_id, si.variant_id, NEW.location_id,
      'stocktake_correction', si.discrepancy, NEW.id, 'stocktake', NEW.approved_by
    FROM stocktake_items si WHERE si.stocktake_id = NEW.id AND si.discrepancy != 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_stocktake
  AFTER UPDATE OF status ON stocktakes
  FOR EACH ROW EXECUTE FUNCTION trg_apply_stocktake();
