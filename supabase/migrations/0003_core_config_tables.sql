-- locations
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_so TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- profiles (extends auth.users)
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','cashier','inventory_manager','admin')),
  full_name TEXT NOT NULL,
  location_id UUID REFERENCES locations(id),
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','so')),
  preferred_currency TEXT NOT NULL DEFAULT 'SLSH' CHECK (preferred_currency IN ('SLSH','USD')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- location_hours
CREATE TABLE location_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  has_prayer_break BOOLEAN NOT NULL DEFAULT false,
  prayer_start TIME,
  prayer_end TIME
);

-- exchange_rates
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usd_to_slsh_rate NUMERIC(10,2) NOT NULL,
  set_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- mobile_money_settings
CREATE TABLE mobile_money_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('zaad','edahab','evc_plus','sahal')),
  merchant_number TEXT NOT NULL,
  instructions_en TEXT NOT NULL,
  instructions_so TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- banners
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_so TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cta_text_en TEXT,
  cta_text_so TEXT,
  cta_url TEXT,
  scope_type TEXT NOT NULL DEFAULT 'all' CHECK (scope_type IN ('all','location')),
  scope_location_id UUID REFERENCES locations(id),
  active_from TIMESTAMPTZ NOT NULL,
  active_until TIMESTAMPTZ NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
