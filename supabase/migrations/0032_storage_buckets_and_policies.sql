INSERT INTO storage.buckets (id, name, public)
VALUES
  ('product-images', 'product-images', true),
  ('product-thumbnails', 'product-thumbnails', true),
  ('category-icons', 'category-icons', true),
  ('banners', 'banners', true),
  ('return-photos', 'return-photos', false),
  ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- return-photos: path convention {customer_id}/{return_id}/{filename}
-- Customers upload/read their own folder; staff can read all (to review returns)
CREATE POLICY "return_photos_customer_upload_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'return-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "return_photos_customer_read_own_folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'return-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "return_photos_staff_read_all" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'return-photos' AND public.is_staff());

-- receipts: generated server-side (service role); customers/staff can read
-- their own path {customer_id_or_location_id}/{filename}
CREATE POLICY "receipts_owner_read_own_folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "receipts_staff_read_all" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND public.is_staff());
