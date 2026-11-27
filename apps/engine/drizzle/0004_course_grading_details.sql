ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "exam_pct" smallint,
  ADD COLUMN IF NOT EXISTS "pset_pct" smallint,
  ADD COLUMN IF NOT EXISTS "grading_known" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "web_address" text,
  ADD COLUMN IF NOT EXISTS "restrictions" text,
  ADD COLUMN IF NOT EXISTS "details_json" jsonb,
  ADD COLUMN IF NOT EXISTS "details_fetched_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_term_grading_idx"
  ON "courses" USING btree ("term","grading_known","exam_pct","pset_pct");
