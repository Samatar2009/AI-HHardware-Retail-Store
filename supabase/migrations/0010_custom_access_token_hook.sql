-- Returns current user's location_id from profiles (used by RLS policies)
CREATE OR REPLACE FUNCTION public.user_location_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT location_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Custom Access Token Hook: enriches the JWT with the user's role so RLS
-- policies can read it from auth.jwt() without a per-row query.
-- Pattern per Supabase's own docs (Custom Claims & RBAC).
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE user_id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', 'null');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

CREATE POLICY "Allow auth admin to read profiles for JWT hook" ON public.profiles
  AS PERMISSIVE FOR SELECT
  TO supabase_auth_admin
  USING (true);
