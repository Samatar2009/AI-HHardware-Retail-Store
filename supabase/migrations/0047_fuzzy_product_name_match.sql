-- POST /api/ai/estimate matches Gemini-generated material names (e.g.
-- "Portland Cement (50kg bag)") against real catalog products (e.g.
-- "Portland Cement 50kg Bag") to pull real prices. A plain
-- ILIKE '%material name%' substring check almost never matches, since the
-- AI's wording rarely matches the catalog's exact naming convention word
-- for word. pg_trgm (already enabled since Phase 1) supports proper
-- fuzzy similarity matching, which is what this needs.
CREATE OR REPLACE FUNCTION public.match_product_by_name(search_text text, similarity_threshold real DEFAULT 0.25)
RETURNS TABLE(product_id uuid, name_en text, similarity real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.name_en, similarity(p.name_en, search_text) AS similarity
  FROM public.products p
  WHERE p.is_active = true
    AND similarity(p.name_en, search_text) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.match_product_by_name(text, real) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_product_by_name(text, real) TO postgres, service_role;
