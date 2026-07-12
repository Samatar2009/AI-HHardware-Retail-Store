-- check_low_stock only fired AFTER UPDATE OF quantity_on_hand, so a brand-new
-- inventory row created by the Phase 8 receive-stock flow (first time a
-- product/variant is stocked at a location) never got evaluated for a
-- low-stock alert even when received below threshold. Add the same trigger
-- function on INSERT.
CREATE TRIGGER check_low_stock_insert
AFTER INSERT ON public.inventory
FOR EACH ROW EXECUTE FUNCTION trg_check_low_stock();
