CREATE OR REPLACE FUNCTION trg_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, performed_by)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
CREATE TRIGGER audit_product_variants AFTER INSERT OR UPDATE OR DELETE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
CREATE TRIGGER audit_categories AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
CREATE TRIGGER audit_inventory AFTER INSERT OR UPDATE OR DELETE ON inventory
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
CREATE TRIGGER audit_discount_codes AFTER INSERT OR UPDATE OR DELETE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
CREATE TRIGGER audit_locations AFTER INSERT OR UPDATE OR DELETE ON locations
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
CREATE TRIGGER audit_profiles AFTER UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
CREATE TRIGGER audit_loyalty_tiers AFTER INSERT OR UPDATE OR DELETE ON loyalty_tiers
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
CREATE TRIGGER audit_mobile_money_settings AFTER INSERT OR UPDATE OR DELETE ON mobile_money_settings
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
CREATE TRIGGER audit_banners AFTER INSERT OR UPDATE OR DELETE ON banners
  FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
