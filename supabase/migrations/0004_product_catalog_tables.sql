-- categories (self-referencing hierarchy)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name_en TEXT NOT NULL,
  name_so TEXT NOT NULL,
  icon_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- products (master record; pricing lives on variants)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_so TEXT NOT NULL,
  description_en TEXT,
  description_so TEXT,
  category_id UUID NOT NULL REFERENCES categories(id),
  brand TEXT,
  unit TEXT NOT NULL DEFAULT 'each',
  sku_base TEXT NOT NULL UNIQUE,
  cost_price_slsh BIGINT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- product_images (ordered gallery; sort_order 0 = primary)
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  alt_text_en TEXT,
  alt_text_so TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- product_variants (the actual purchasable unit)
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  price_slsh BIGINT NOT NULL,
  cost_price_slsh BIGINT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- product_embeddings (pgvector, for semantic search)
CREATE TABLE product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en','so','combined')),
  embedding vector(768) NOT NULL,
  embedding_text TEXT NOT NULL,
  last_embedded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_version TEXT NOT NULL DEFAULT 'text-embedding-004'
);
