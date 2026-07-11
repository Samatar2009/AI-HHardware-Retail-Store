-- Phase 5 Step 5.1: recursive category tree for GET /api/categories.
CREATE OR REPLACE FUNCTION public.get_category_tree()
RETURNS TABLE (
  id uuid,
  name_en text,
  name_so text,
  parent_id uuid,
  icon_url text,
  sort_order int,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH RECURSIVE tree AS (
    SELECT c.id, c.name_en, c.name_so, c.parent_id, c.icon_url, c.sort_order, c.is_active
    FROM public.categories c
    WHERE c.parent_id IS NULL AND c.is_active = true
    UNION ALL
    SELECT c.id, c.name_en, c.name_so, c.parent_id, c.icon_url, c.sort_order, c.is_active
    FROM public.categories c
    JOIN tree t ON c.parent_id = t.id
    WHERE c.is_active = true
  )
  SELECT * FROM tree ORDER BY sort_order;
$$;

REVOKE EXECUTE ON FUNCTION public.get_category_tree() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_category_tree() TO anon, authenticated, postgres, service_role;
