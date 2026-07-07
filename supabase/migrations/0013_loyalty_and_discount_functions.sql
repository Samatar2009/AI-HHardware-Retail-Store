-- calculate_loyalty_tier(): returns tier name for a given lifetime points total
CREATE OR REPLACE FUNCTION calculate_loyalty_tier(p_lifetime_points INTEGER)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE
  _tier TEXT;
BEGIN
  SELECT tier_name INTO _tier
  FROM loyalty_tiers
  WHERE min_lifetime_points <= p_lifetime_points
  ORDER BY min_lifetime_points DESC
  LIMIT 1;
  RETURN COALESCE(_tier, 'bronze');
END;
$$;

-- check_discount_code_validity(): validates a code for a customer + order total
CREATE OR REPLACE FUNCTION check_discount_code_validity(
  p_code TEXT,
  p_customer_id UUID,
  p_order_total BIGINT
)
RETURNS TABLE(is_valid BOOLEAN, discount_amount_slsh BIGINT, error_message TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  dc public.discount_codes%ROWTYPE;
  uses INTEGER;
BEGIN
  SELECT * INTO dc FROM public.discount_codes
  WHERE upper(code) = upper(p_code) AND is_active = true
  AND now() BETWEEN valid_from AND valid_until;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::BIGINT, 'Invalid or expired code';
    RETURN;
  END IF;

  IF dc.max_total_uses IS NOT NULL AND dc.uses_count >= dc.max_total_uses THEN
    RETURN QUERY SELECT false, 0::BIGINT, 'Code has reached its usage limit';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO uses FROM public.discount_code_uses
  WHERE discount_code_id = dc.id AND customer_id = p_customer_id;

  IF uses >= dc.max_uses_per_customer THEN
    RETURN QUERY SELECT false, 0::BIGINT, 'You have already used this code';
    RETURN;
  END IF;

  IF p_order_total < dc.minimum_order_slsh THEN
    RETURN QUERY SELECT false, 0::BIGINT,
      'Minimum order of ' || dc.minimum_order_slsh || ' SLSH required';
    RETURN;
  END IF;

  RETURN QUERY SELECT true,
    CASE dc.discount_type
      WHEN 'percentage' THEN (p_order_total * dc.value / 100)::BIGINT
      ELSE dc.value::BIGINT
    END,
    NULL::TEXT;
END;
$$;

-- match_products_semantic(): pgvector cosine-similarity search
CREATE OR REPLACE FUNCTION match_products_semantic(
  query_embedding vector(768),
  match_limit INTEGER DEFAULT 20,
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE(product_id UUID, similarity FLOAT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN QUERY
  SELECT pe.product_id,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM public.product_embeddings pe
  JOIN public.products p ON p.id = pe.product_id
  WHERE p.is_active = true
    AND (p_location_id IS NULL OR EXISTS (
      SELECT 1 FROM public.inventory i
      WHERE i.product_id = pe.product_id
        AND i.location_id = p_location_id
        AND (i.quantity_on_hand - i.quantity_reserved) > 0
    ))
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;
