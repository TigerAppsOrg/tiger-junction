CREATE TYPE "public"."status" AS ENUM('open', 'closed', 'cancelled');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_instructor_map" (
	"course_id" integer NOT NULL,
	"instructor_id" text NOT NULL,
	CONSTRAINT "course_instructor_map_course_id_instructor_id_pk" PRIMARY KEY("course_id","instructor_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"term" smallint NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"status" "status" DEFAULT 'open' NOT NULL,
	"dists" text[],
	"grading_basis" text NOT NULL,
	"calculated_rating" real,
	"num_evals" integer,
	"has_final" boolean
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"times" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evaluations" (
	"course_id" integer NOT NULL,
	"num_comments" integer,
	"comments" text[],
	"summary" text,
	"rating" real,
	"rating_source" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"feedback" text NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT '2024-11-03 23:39:35.828' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "icals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"schedule_id" integer NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instructors" (
	"emplid" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rating" real,
	"num_evals" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedule_course_map" (
	"schedule_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	CONSTRAINT "schedule_course_map_schedule_id_course_id_pk" PRIMARY KEY("schedule_id","course_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedule_event_map" (
	"schedule_id" integer NOT NULL,
	"custom_event_id" integer NOT NULL,
	CONSTRAINT "schedule_event_map_schedule_id_custom_event_id_pk" PRIMARY KEY("schedule_id","custom_event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"term" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"netid" text NOT NULL,
	"year" smallint NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_instructor_map" ADD CONSTRAINT "course_instructor_map_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_instructor_map" ADD CONSTRAINT "course_instructor_map_instructor_id_instructors_emplid_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("emplid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_events" ADD CONSTRAINT "custom_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "icals" ADD CONSTRAINT "icals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "icals" ADD CONSTRAINT "icals_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule_course_map" ADD CONSTRAINT "schedule_course_map_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule_course_map" ADD CONSTRAINT "schedule_course_map_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule_event_map" ADD CONSTRAINT "schedule_event_map_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule_event_map" ADD CONSTRAINT "schedule_event_map_custom_event_id_custom_events_id_fk" FOREIGN KEY ("custom_event_id") REFERENCES "public"."custom_events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
