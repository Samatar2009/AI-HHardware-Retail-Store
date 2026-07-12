-- trg_audit_log hardcoded NEW.id/OLD.id, which fails at runtime for any
-- table whose primary key isn't literally named "id" — profiles uses
-- user_id. Every write to profiles with the audit_profiles trigger
-- attached has been failing since it was created (confirmed: zero
-- 'profiles' rows in audit_log despite known profile operations, and a
-- direct UPDATE reproduces "record NEW has no field id"). Extracting the
-- id via the JSONB representation instead of a direct field reference
-- resolves at runtime against whatever columns actually exist, so it
-- works for both naming conventions used across this schema.
CREATE OR REPLACE FUNCTION public.trg_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  _record_id uuid;
BEGIN
  _record_id := COALESCE(
    (to_jsonb(COALESCE(NEW, OLD))->>'id')::uuid,
    (to_jsonb(COALESCE(NEW, OLD))->>'user_id')::uuid
  );

  INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, performed_by)
  VALUES (
    TG_TABLE_NAME,
    _record_id,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;
