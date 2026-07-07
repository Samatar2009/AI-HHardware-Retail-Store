-- release_expired_reservations(): runs every 10 min via pg_cron.
-- Releases inventory holds and cancels orders stuck in pending_payment > 30 min.
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory i
  SET quantity_reserved = GREATEST(0, quantity_reserved - oi.quantity),
      updated_at = now()
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = i.product_id
    AND (oi.variant_id = i.variant_id OR (oi.variant_id IS NULL AND i.variant_id IS NULL))
    AND o.status = 'pending_payment'
    AND o.created_at < now() - interval '30 minutes';

  UPDATE orders
  SET status = 'cancelled',
      cancellation_reason = 'Payment timeout — auto-cancelled after 30 minutes',
      updated_at = now()
  WHERE status = 'pending_payment'
    AND created_at < now() - interval '30 minutes';
END;
$$;

SELECT cron.schedule('release-reservations', '*/10 * * * *',
  'SELECT release_expired_reservations()');

-- expire_parked_transactions(): runs every 30 min via pg_cron.
CREATE OR REPLACE FUNCTION expire_parked_transactions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM parked_transactions
  WHERE expires_at < now() AND is_recalled = false;
END;
$$;

SELECT cron.schedule('expire-parked-carts', '*/30 * * * *',
  'SELECT expire_parked_transactions()');
