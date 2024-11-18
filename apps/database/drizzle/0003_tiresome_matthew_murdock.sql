CREATE TABLE IF NOT EXISTS "sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"title" text NOT NULL,
	"num" integer NOT NULL,
	"room" text,
	"tot" smallint NOT NULL,
	"cap" smallint NOT NULL,
	"days" smallint NOT NULL,
	"start_time" integer NOT NULL,
	"end_time" integer NOT NULL,
	"status" "status" DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evaluations" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "relative_id" integer NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sections" ADD CONSTRAINT "sections_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "schedule_course_map" DROP COLUMN IF EXISTS "sections";