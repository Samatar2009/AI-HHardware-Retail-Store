-- ai_forecasts had no uniqueness constraint, so re-running a forecast for
-- the same product/variant/location (e.g. clicking "Refresh") would insert
-- a duplicate row rather than replace the stale one.
ALTER TABLE public.ai_forecasts
  ADD CONSTRAINT ai_forecasts_product_variant_location_key UNIQUE (product_id, variant_id, location_id);
