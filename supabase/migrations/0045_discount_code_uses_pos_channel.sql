-- discount_code_uses.order_id was NOT NULL, tying usage tracking exclusively
-- to the online orders flow. Phase 9's POS terminal also lets a discount
-- code be applied to an in-store sale (pos_transactions, not orders), so
-- without this the max_uses_per_customer check in
-- check_discount_code_validity() would never see POS-channel usage,
-- letting a customer bypass a single-use code by alternating between
-- online checkout and in-store purchases.
ALTER TABLE public.discount_code_uses ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.discount_code_uses ADD COLUMN pos_transaction_id UUID REFERENCES public.pos_transactions(id);
ALTER TABLE public.discount_code_uses ADD CONSTRAINT discount_code_uses_channel_check
  CHECK (order_id IS NOT NULL OR pos_transaction_id IS NOT NULL);
