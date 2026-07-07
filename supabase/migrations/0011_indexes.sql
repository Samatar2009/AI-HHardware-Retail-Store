-- Trigram indexes for fast keyword search (bilingual)
CREATE INDEX idx_products_name_en_trgm ON products USING GIN (name_en gin_trgm_ops);
CREATE INDEX idx_products_name_so_trgm ON products USING GIN (name_so gin_trgm_ops);
CREATE INDEX idx_products_tags ON products USING GIN (tags);

-- Performance indexes on frequently-queried columns
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_location ON orders (location_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_inventory_location ON inventory (location_id);
CREATE INDEX idx_pos_transactions_session ON pos_transactions (pos_session_id);
CREATE INDEX idx_audit_log_table ON audit_log (table_name, record_id);

-- NOTE: IVFFlat index on product_embeddings is intentionally deferred.
-- lists=100 needs a meaningful amount of data to produce useful clusters;
-- create it once the catalog has 100+ embedded products (Phase 11):
-- CREATE INDEX idx_embeddings_ivfflat ON product_embeddings
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
