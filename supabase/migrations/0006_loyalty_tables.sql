-- loyalty_tiers (seeded once, admin-updatable thereafter)
CREATE TABLE loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL UNIQUE CHECK (tier_name IN ('bronze','silver','gold')),
  tier_name_so TEXT NOT NULL,
  min_lifetime_points INTEGER NOT NULL,
  discount_percentage NUMERIC(4,2) NOT NULL,
  updated_by UUID REFERENCES profiles(user_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- loyalty_cards (one per customer, auto-created by trigger)
CREATE TABLE loyalty_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES profiles(user_id) ON DELETE CASCADE,
  card_number TEXT NOT NULL UNIQUE,
  current_points INTEGER NOT NULL DEFAULT 0 CHECK (current_points >= 0),
  lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  current_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (current_tier IN ('bronze','silver','gold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- loyalty_transactions (immutable ledger — append only)
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_card_id UUID NOT NULL REFERENCES loyalty_cards(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn','redeem','adjust')),
  points INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  performed_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
