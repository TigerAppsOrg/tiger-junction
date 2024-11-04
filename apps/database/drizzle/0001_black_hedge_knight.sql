ALTER TABLE "feedback" ALTER COLUMN "created_at" SET DEFAULT '2024-11-04 01:58:35.110';--> statement-breakpoint
ALTER TABLE "schedule_course_map" ADD COLUMN "color" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_course_map" ADD COLUMN "is_complete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_course_map" ADD COLUMN "confirms" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_course_map" ADD COLUMN "sections" text[];