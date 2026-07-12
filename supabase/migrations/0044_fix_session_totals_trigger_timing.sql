-- trg_update_session_totals only fires AFTER INSERT/UPDATE ON pos_transactions,
-- but total_cash_sales_slsh is computed by joining to pos_payment_splits,
-- which are always inserted in a later statement (after the pos_transaction
-- row exists, mirroring the order_items/orders pattern from Phase 6). At the
-- moment the trigger first fires, no payment splits exist yet, so
-- total_cash_sales_slsh is silently computed as 0 and only becomes correct
-- if some later, unrelated transaction in the same session happens to
-- re-fire the trigger. This corrupts the Step 9.1 session-close cash
-- variance calculation. Fix: also fire the same recompute after
-- pos_payment_splits are inserted.
CREATE OR REPLACE FUNCTION public.trg_update_session_totals_from_split()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE
  _session_id UUID;
BEGIN
  SELECT pos_session_id INTO _session_id FROM pos_transactions WHERE id = NEW.pos_transaction_id;

  UPDATE pos_sessions
  SET total_sales_slsh = (
        SELECT COALESCE(SUM(total_slsh),0) FROM pos_transactions
        WHERE pos_session_id = _session_id AND status = 'completed'
      ),
      total_cash_sales_slsh = (
        SELECT COALESCE(SUM(pps.amount_slsh),0)
        FROM pos_transactions pt
        JOIN pos_payment_splits pps ON pps.pos_transaction_id = pt.id
        WHERE pt.pos_session_id = _session_id
          AND pt.status = 'completed'
          AND pps.payment_method = 'cash'
      ),
      total_voids_slsh = (
        SELECT COALESCE(SUM(total_slsh),0) FROM pos_transactions
        WHERE pos_session_id = _session_id AND status = 'voided'
      )
  WHERE id = _session_id;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_session_totals_from_split
AFTER INSERT ON public.pos_payment_splits
FOR EACH ROW EXECUTE FUNCTION trg_update_session_totals_from_split();
