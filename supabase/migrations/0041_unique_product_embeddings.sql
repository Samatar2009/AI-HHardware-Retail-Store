-- product_embeddings had no uniqueness constraint, so re-embedding a product
-- (e.g. after an admin edit) would insert a duplicate row rather than
-- replace the stale one. One row per (product_id, language) is the intended
-- shape (language in 'en' | 'so' | 'combined').
ALTER TABLE public.product_embeddings
  ADD CONSTRAINT product_embeddings_product_language_key UNIQUE (product_id, language);
