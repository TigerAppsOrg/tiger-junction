CREATE UNIQUE INDEX IF NOT EXISTS "courses_listing_id_term_index" ON "courses" USING btree ("listing_id","term");