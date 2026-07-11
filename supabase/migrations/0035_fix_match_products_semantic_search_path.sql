-- match_products_semantic was created with SET search_path = '' during
-- Phase 1 hardening. That breaks resolution of pgvector's <=> operator
-- (installed in public), since bare operator symbols — unlike schema-
-- qualified types/tables — can't be resolved with an empty search_path.
-- All object references inside the function are already schema-qualified,
-- so search_path='public' is safe here (matches the pattern used for the
-- rest of this project's functions).
ALTER FUNCTION public.match_products_semantic(vector, integer, uuid) SET search_path = 'public';
