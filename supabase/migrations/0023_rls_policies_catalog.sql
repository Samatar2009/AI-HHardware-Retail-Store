-- categories (public read, admin write)
CREATE POLICY categories_select_public ON categories FOR SELECT USING (true);
CREATE POLICY categories_admin_insert ON categories FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY categories_admin_update ON categories FOR UPDATE USING (public.is_admin());
CREATE POLICY categories_admin_delete ON categories FOR DELETE USING (public.is_admin());

-- products
CREATE POLICY products_select_public ON products FOR SELECT
  USING (is_active = true);
CREATE POLICY products_select_staff ON products FOR SELECT
  USING (public.user_role() IN ('admin','inventory_manager'));
CREATE POLICY products_staff_insert ON products FOR INSERT
  WITH CHECK (public.user_role() IN ('admin','inventory_manager'));
CREATE POLICY products_staff_update ON products FOR UPDATE
  USING (public.user_role() IN ('admin','inventory_manager'));
CREATE POLICY products_admin_delete ON products FOR DELETE
  USING (public.is_admin());

-- product_images
CREATE POLICY product_images_select_public ON product_images FOR SELECT USING (true);
CREATE POLICY product_images_staff_insert ON product_images FOR INSERT
  WITH CHECK (public.user_role() IN ('admin','inventory_manager'));
CREATE POLICY product_images_staff_update ON product_images FOR UPDATE
  USING (public.user_role() IN ('admin','inventory_manager'));
CREATE POLICY product_images_staff_delete ON product_images FOR DELETE
  USING (public.user_role() IN ('admin','inventory_manager'));

-- product_variants
CREATE POLICY product_variants_select_public ON product_variants FOR SELECT
  USING (is_active = true);
CREATE POLICY product_variants_select_staff ON product_variants FOR SELECT
  USING (public.user_role() IN ('admin','inventory_manager'));
CREATE POLICY product_variants_staff_insert ON product_variants FOR INSERT
  WITH CHECK (public.user_role() IN ('admin','inventory_manager'));
CREATE POLICY product_variants_staff_update ON product_variants FOR UPDATE
  USING (public.user_role() IN ('admin','inventory_manager'));
CREATE POLICY product_variants_admin_delete ON product_variants FOR DELETE
  USING (public.is_admin());

-- product_embeddings (read by any authenticated user; writes are service-role only)
CREATE POLICY product_embeddings_select_authenticated ON product_embeddings FOR SELECT
  USING (auth.uid() IS NOT NULL);
