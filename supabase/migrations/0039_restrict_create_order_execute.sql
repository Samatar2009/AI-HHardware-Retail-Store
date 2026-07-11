-- create_order is SECURITY DEFINER and accepts p_customer_id as a plain
-- parameter rather than deriving it from auth.uid(). It was reachable
-- directly by any authenticated (and, via Supabase's default per-schema
-- privilege that auto-grants EXECUTE to anon/authenticated on every new
-- public-schema function — separate from, and not touched by, REVOKE
-- ... FROM PUBLIC) even anonymous caller, who could pass an arbitrary
-- customer_id and create orders / redeem loyalty points as another
-- customer. /api/orders already calls this via the admin (service_role)
-- client after authenticating the caller itself, so restricting to
-- service_role/postgres requires no application change.
REVOKE EXECUTE ON FUNCTION public.create_order(uuid, uuid, jsonb, text, text, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, uuid, jsonb, text, text, boolean, text) TO postgres, service_role;
