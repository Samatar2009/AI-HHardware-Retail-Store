-- Build Plan Phase 11 Step 11.5: weekly auto-forecast, Sunday midnight.
-- Calls the weekly-forecast Edge Function via pg_net, which requires the
-- Edge Function's own GEMINI_API_KEY secret to be set separately (outside
-- SQL migrations) before this will do anything other than fail cleanly.
CREATE EXTENSION IF NOT EXISTS pg_net;

-- cron.job (and thus this literal) is only readable by the postgres and
-- service_role roles in Supabase's managed permission model — anon and
-- authenticated have no access to pg_cron's catalog tables. This mirrors
-- Supabase's own documented pattern for scheduling authenticated HTTP
-- calls to Edge Functions from pg_cron.
SELECT cron.schedule(
  'weekly-inventory-forecast',
  '0 0 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://ebxitnzrozdzimaaqvcg.supabase.co/functions/v1/weekly-forecast',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer REPLACE_WITH_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
