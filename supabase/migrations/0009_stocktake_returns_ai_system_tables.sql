-- stocktakes
CREATE TABLE stocktakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  initiated_by UUID NOT NULL REFERENCES profiles(user_id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(user_id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- stocktake_items
CREATE TABLE stocktake_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_id UUID NOT NULL REFERENCES stocktakes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  system_quantity INTEGER NOT NULL,
  counted_quantity INTEGER NOT NULL,
  discrepancy INTEGER GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  notes TEXT
);

-- returns (exactly one of order_id / pos_transaction_id must be set)
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  pos_transaction_id UUID REFERENCES pos_transactions(id),
  customer_id UUID NOT NULL REFERENCES profiles(user_id),
  location_id UUID NOT NULL REFERENCES locations(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  refund_method TEXT CHECK (refund_method IN ('original_payment','cash','store_credit')),
  refund_amount_slsh BIGINT,
  mobile_money_phone TEXT,
  refund_reference TEXT,
  rejection_reason TEXT,
  processed_by UUID REFERENCES profiles(user_id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((order_id IS NOT NULL) <> (pos_transaction_id IS NOT NULL))
);

-- return_items
CREATE TABLE return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id),
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  photo_urls TEXT[] NOT NULL DEFAULT '{}'
);

-- ai_forecasts (Gemini-generated reorder predictions)
CREATE TABLE ai_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  predicted_stockout_date DATE NOT NULL,
  recommended_reorder_qty INTEGER NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  reasoning_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_period_days INTEGER NOT NULL DEFAULT 90
);

-- audit_log (immutable, append-only)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES profiles(user_id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sms_logs
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone TEXT NOT NULL,
  message_text TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed')),
  twilio_sid TEXT,
  error_code TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
