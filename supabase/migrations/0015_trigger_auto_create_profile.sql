-- Auto-creates a profiles row whenever a new Supabase Auth user signs up.
CREATE OR REPLACE FUNCTION trg_auto_create_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone, role, full_name)
  VALUES (NEW.id, NEW.phone, 'customer', COALESCE(NEW.raw_user_meta_data->>'full_name',''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION trg_auto_create_profile();
