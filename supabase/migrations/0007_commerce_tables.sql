-- discount_codes
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed_slsh')),
  value NUMERIC(10,2) NOT NULL,
  minimum_order_slsh BIGINT NOT NULL DEFAULT 0,
  max_total_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  max_uses_per_customer INTEGER NOT NULL DEFAULT 1,
  scope_type TEXT NOT NULL DEFAULT 'all' CHECK (scope_type IN ('all','category','product')),
  scope_id UUID,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- orders (online customer orders)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES profiles(user_id),
  location_id UUID NOT NULL REFERENCES locations(id),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','payment_submitted','payment_confirmed','ready_for_pickup','completed','cancelled')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('zaad','edahab','evc_plus','sahal','cash_on_pickup')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','submitted','confirmed','failed')),
  subtotal_slsh BIGINT NOT NULL,
  discount_amount_slsh BIGINT NOT NULL DEFAULT 0,
  loyalty_discount_slsh BIGINT NOT NULL DEFAULT 0,
  total_slsh BIGINT NOT NULL,
  discount_code_id UUID REFERENCES discount_codes(id),
  loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0,
  loyalty_points_earned INTEGER NOT NULL DEFAULT 0,
  pickup_code TEXT UNIQUE,
  payment_reference TEXT,
  cancellation_reason TEXT,
  notes TEXT,
  exchange_rate_at_order NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- order_items (product name/SKU snapshotted at time of order)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name_en TEXT NOT NULL,
  product_name_so TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_slsh BIGINT NOT NULL,
  total_price_slsh BIGINT NOT NULL
);

-- discount_code_uses (prevents exceeding per-customer limits)
CREATE TABLE discount_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(user_id),
  order_id UUID NOT NULL REFERENCES orders(id),
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (discount_code_id, customer_id, order_id)
);

-- payment_transactions
-- NOTE: pos_transaction_id has no FK yet — pos_transactions is created later
-- in the POS group; the constraint is added via ALTER TABLE at that point.
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  pos_transaction_id UUID,
  payment_method TEXT NOT NULL,
  amount_slsh BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  transaction_reference TEXT,
  confirmed_by UUID REFERENCES profiles(user_id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
