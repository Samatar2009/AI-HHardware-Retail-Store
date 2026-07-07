-- Pin search_path on every function that didn't already set one. This closes
-- a well-known search_path-hijacking vector for SECURITY DEFINER functions
-- and is flagged by Supabase's own security linter otherwise.
ALTER FUNCTION public.user_role() SET search_path = 'public';
ALTER FUNCTION public.is_admin() SET search_path = 'public';
ALTER FUNCTION public.is_staff() SET search_path = 'public';
ALTER FUNCTION public.custom_access_token_hook(jsonb) SET search_path = 'public';
ALTER FUNCTION public.generate_order_number() SET search_path = 'public';
ALTER FUNCTION public.trg_set_order_number() SET search_path = 'public';
ALTER FUNCTION public.generate_pos_transaction_number() SET search_path = 'public';
ALTER FUNCTION public.trg_set_pos_transaction_number() SET search_path = 'public';
ALTER FUNCTION public.generate_pickup_code() SET search_path = 'public';
ALTER FUNCTION public.calculate_loyalty_tier(integer) SET search_path = 'public';
ALTER FUNCTION public.release_expired_reservations() SET search_path = 'public';
ALTER FUNCTION public.expire_parked_transactions() SET search_path = 'public';
ALTER FUNCTION public.trg_reserve_inventory() SET search_path = 'public';
ALTER FUNCTION public.trg_confirm_inventory() SET search_path = 'public';
ALTER FUNCTION public.trg_release_reservation() SET search_path = 'public';
ALTER FUNCTION public.trg_create_loyalty_card() SET search_path = 'public';
ALTER FUNCTION public.trg_award_loyalty_points() SET search_path = 'public';
ALTER FUNCTION public.trg_check_low_stock() SET search_path = 'public';
ALTER FUNCTION public.trg_update_session_totals() SET search_path = 'public';
ALTER FUNCTION public.trg_apply_stocktake() SET search_path = 'public';

-- Trigger functions must never be callable directly via the PostgREST RPC
-- endpoint (Supabase auto-exposes public-schema functions to anon/authenticated
-- by default). They still fire normally via the trigger mechanism, which does
-- not go through this EXECUTE check.
REVOKE EXECUTE ON FUNCTION public.trg_set_order_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_set_pos_transaction_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_reserve_inventory() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_confirm_inventory() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_release_reservation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_create_loyalty_card() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_award_loyalty_points() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_check_low_stock() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_update_session_totals() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_apply_stocktake() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_audit_log() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_auto_create_profile() FROM anon, authenticated;

-- Discount validation requires a logged-in customer (guest checkout isn't
-- supported), so anon doesn't need it.
REVOKE EXECUTE ON FUNCTION public.check_discount_code_validity(text, uuid, bigint) FROM anon;

-- match_products_semantic and user_location_id are intentionally callable by
-- anon/authenticated (public catalog search; own-location lookup) — no change.
