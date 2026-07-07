-- generate_order_number(): BH-YYYY-NNNNN, sequential
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'BH-' || to_char(now(), 'YYYY') || '-'
    || lpad(nextval('order_number_seq')::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION trg_set_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.order_number := generate_order_number();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_set_order_number();

-- generate_pos_transaction_number(): POS-YYYY-NNNNN, sequential
CREATE SEQUENCE IF NOT EXISTS pos_txn_seq START 1;

CREATE OR REPLACE FUNCTION generate_pos_transaction_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'POS-' || to_char(now(), 'YYYY') || '-'
    || lpad(nextval('pos_txn_seq')::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION trg_set_pos_transaction_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.transaction_number IS NULL THEN
    NEW.transaction_number := generate_pos_transaction_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_pos_transaction_number
  BEFORE INSERT ON pos_transactions
  FOR EACH ROW EXECUTE FUNCTION trg_set_pos_transaction_number();

-- generate_pickup_code(): unique 6-char alphanumeric, retries on collision
CREATE OR REPLACE FUNCTION generate_pickup_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  tries INTEGER := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random()*length(chars)+1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE pickup_code = code);
    tries := tries + 1;
    IF tries > 20 THEN RAISE EXCEPTION 'pickup_code: too many collisions'; END IF;
  END LOOP;
  RETURN code;
END;
$$;
