-- reserve_inventory previously fired AFTER INSERT ON orders, before any
-- order_items existed for that order (they're inserted in a later
-- statement, since order_items.order_id FKs to orders.id). The trigger's
-- EXISTS/UPDATE against order_items always matched zero rows, so stock
-- was never actually reserved on order creation. Moving it to fire on
-- order_items insert instead, operating on the single new row (NEW),
-- fixes this — location_id is looked up from the parent order.

CREATE OR REPLACE FUNCTION public.trg_reserve_inventory()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _location_id UUID;
  _available INTEGER;
BEGIN
  SELECT location_id INTO _location_id FROM orders WHERE id = NEW.order_id;

  SELECT (quantity_on_hand - quantity_reserved) INTO _available
  FROM inventory
  WHERE product_id = NEW.product_id
    AND (variant_id = NEW.variant_id OR (variant_id IS NULL AND NEW.variant_id IS NULL))
    AND location_id = _location_id;

  IF _available IS NULL OR _available < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for one or more items';
  END IF;

  UPDATE inventory
  SET quantity_reserved = quantity_reserved + NEW.quantity,
      updated_at = now()
  WHERE product_id = NEW.product_id
    AND (variant_id = NEW.variant_id OR (variant_id IS NULL AND NEW.variant_id IS NULL))
    AND location_id = _location_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS reserve_inventory ON public.orders;
CREATE TRIGGER reserve_inventory
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION trg_reserve_inventory();
