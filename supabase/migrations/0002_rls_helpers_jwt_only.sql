-- RLS helper functions that only read the JWT claim (no table dependency).
-- Supabase reserves the `auth` schema for its own objects, so these live in
-- `public` instead — this is Supabase's own documented pattern for custom
-- claims/RBAC (see: Custom Claims & Role-based Access Control docs).
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'user_role')::text;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT public.user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT public.user_role() IN ('cashier','inventory_manager','admin');
$$;
