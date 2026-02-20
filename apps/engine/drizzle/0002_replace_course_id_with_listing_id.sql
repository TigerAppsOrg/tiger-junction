DROP INDEX IF EXISTS "evaluations_course_id_eval_term_idx";--> statement-breakpoint
ALTER TABLE "evaluations" DROP CONSTRAINT IF EXISTS "evaluations_course_id_courses_id_fk";--> statement-breakpoint
ALTER TABLE "evaluations" DROP COLUMN IF EXISTS "course_id";--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "listing_id" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "evaluations_listing_id_eval_term_idx" ON "evaluations" USING btree ("listing_id","eval_term");
