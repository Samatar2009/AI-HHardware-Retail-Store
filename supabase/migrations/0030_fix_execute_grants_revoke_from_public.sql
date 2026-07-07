-- Postgres grants EXECUTE to the PUBLIC pseudo-role by default on function
-- creation, and anon/authenticated inherit through PUBLIC regardless of any
-- REVOKE targeted at their own role name. Must revoke from PUBLIC directly.

REVOKE EXECUTE ON FUNCTION public.trg_set_order_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_set_pos_transaction_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_reserve_inventory() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_confirm_inventory() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_release_reservation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_create_loyalty_card() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_award_loyalty_points() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_check_low_stock() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_update_session_totals() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_apply_stocktake() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_audit_log() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_auto_create_profile() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC;

-- check_discount_code_validity: revoke the blanket PUBLIC grant, then
-- re-grant only to authenticated (guest checkout is not supported).
REVOKE EXECUTE ON FUNCTION public.check_discount_code_validity(text, uuid, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_discount_code_validity(text, uuid, bigint) TO authenticated;

-- Explicitly grant back to service_role/postgres so server-side code and
-- migrations are unaffected (Postgres does this by default, but making it
-- explicit here for clarity now that PUBLIC no longer covers it).
GRANT EXECUTE ON FUNCTION public.trg_set_order_number() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_set_pos_transaction_number() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_reserve_inventory() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_confirm_inventory() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_release_reservation() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_create_loyalty_card() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_award_loyalty_points() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_check_low_stock() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_update_session_totals() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_apply_stocktake() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_audit_log() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_auto_create_profile() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO postgres, service_role, supabase_auth_admin;
