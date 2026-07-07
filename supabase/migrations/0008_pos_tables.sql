-- pos_sessions (cashier shift)
CREATE TABLE pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES profiles(user_id),
  location_id UUID NOT NULL REFERENCES locations(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  starting_cash_slsh BIGINT NOT NULL DEFAULT 0,
  starting_cash_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  ending_cash_slsh BIGINT,
  ending_cash_usd NUMERIC(10,2),
  total_sales_slsh BIGINT NOT NULL DEFAULT 0,
  total_cash_sales_slsh BIGINT NOT NULL DEFAULT 0,
  total_voids_slsh BIGINT NOT NULL DEFAULT 0,
  cash_variance_slsh BIGINT GENERATED ALWAYS AS (ending_cash_slsh - starting_cash_slsh - total_cash_sales_slsh) STORED,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- A cashier may only have one open session at a time at a given location.
CREATE UNIQUE INDEX pos_sessions_one_open_per_cashier
  ON pos_sessions (cashier_id)
  WHERE status = 'open';

-- pos_transactions
CREATE TABLE pos_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_session_id UUID NOT NULL REFERENCES pos_sessions(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  transaction_number TEXT NOT NULL UNIQUE,
  cashier_id UUID NOT NULL REFERENCES profiles(user_id),
  customer_id UUID REFERENCES profiles(user_id),
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','voided')),
  subtotal_slsh BIGINT NOT NULL,
  discount_amount_slsh BIGINT NOT NULL DEFAULT 0,
  total_slsh BIGINT NOT NULL,
  loyalty_points_earned INTEGER NOT NULL DEFAULT 0,
  discount_code_id UUID REFERENCES discount_codes(id),
  void_reason TEXT,
  voided_by UUID REFERENCES profiles(user_id),
  voided_at TIMESTAMPTZ,
  exchange_rate_at_sale NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now that pos_transactions exists, add the deferred FK from payment_transactions
ALTER TABLE payment_transactions
  ADD CONSTRAINT payment_transactions_pos_transaction_id_fkey
  FOREIGN KEY (pos_transaction_id) REFERENCES pos_transactions(id);

-- pos_transaction_items
CREATE TABLE pos_transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_transaction_id UUID NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name_en TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_slsh BIGINT NOT NULL,
  total_price_slsh BIGINT NOT NULL
);

-- pos_payment_splits (supports split payment across methods)
CREATE TABLE pos_payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_transaction_id UUID NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','zaad','edahab','evc_plus','sahal')),
  amount_slsh BIGINT NOT NULL,
  change_slsh BIGINT NOT NULL DEFAULT 0,
  transaction_reference TEXT,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_by UUID REFERENCES profiles(user_id),
  confirmed_at TIMESTAMPTZ
);

-- parked_transactions (held carts, auto-expire via pg_cron)
CREATE TABLE parked_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_session_id UUID NOT NULL REFERENCES pos_sessions(id) ON DELETE CASCADE,
  cashier_id UUID NOT NULL REFERENCES profiles(user_id),
  location_id UUID NOT NULL REFERENCES locations(id),
  cart_data JSONB NOT NULL,
  parked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '4 hours',
  is_recalled BOOLEAN NOT NULL DEFAULT false
);
