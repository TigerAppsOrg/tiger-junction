CREATE TYPE "public"."status" AS ENUM('open', 'closed', 'canceled');--> statement-breakpoint
CREATE TABLE "analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"event" text NOT NULL,
	"page" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_department_map" (
	"course_id" text NOT NULL,
	"department_code" text NOT NULL,
	CONSTRAINT "course_department_map_course_id_department_code_pk" PRIMARY KEY("course_id","department_code")
);
--> statement-breakpoint
CREATE TABLE "course_instructor_map" (
	"course_id" text NOT NULL,
	"instructor_id" text NOT NULL,
	CONSTRAINT "course_instructor_map_course_id_instructor_id_pk" PRIMARY KEY("course_id","instructor_id")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"term" smallint NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "status" DEFAULT 'open' NOT NULL,
	"dists" text[],
	"grading_basis" text NOT NULL,
	"has_final" boolean
);
--> statement-breakpoint
CREATE TABLE "custom_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"times" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"num_comments" integer,
	"comments" text[],
	"summary" text,
	"rating" real,
	"rating_source" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"feedback" text NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "icals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"schedule_id" integer NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instructors" (
	"netid" text PRIMARY KEY NOT NULL,
	"emplid" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"department" text,
	"email" text,
	"office" text,
	"rating" real,
	"rating_uncertainty" real,
	"num_ratings" integer
);
--> statement-breakpoint
CREATE TABLE "schedule_course_map" (
	"schedule_id" integer NOT NULL,
	"course_id" text NOT NULL,
	"color" smallint NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"confirms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "schedule_course_map_schedule_id_course_id_pk" PRIMARY KEY("schedule_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "schedule_event_map" (
	"schedule_id" integer NOT NULL,
	"custom_event_id" integer NOT NULL,
	CONSTRAINT "schedule_event_map_schedule_id_custom_event_id_pk" PRIMARY KEY("schedule_id","custom_event_id")
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"relative_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"term" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"num" text NOT NULL,
	"room" text,
	"tot" smallint NOT NULL,
	"cap" smallint NOT NULL,
	"days" smallint NOT NULL,
	"start_time" integer NOT NULL,
	"end_time" integer NOT NULL,
	"status" "status" DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"netid" text NOT NULL,
	"year" smallint NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_department_map" ADD CONSTRAINT "course_department_map_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_department_map" ADD CONSTRAINT "course_department_map_department_code_departments_code_fk" FOREIGN KEY ("department_code") REFERENCES "public"."departments"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_instructor_map" ADD CONSTRAINT "course_instructor_map_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_instructor_map" ADD CONSTRAINT "course_instructor_map_instructor_id_instructors_netid_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("netid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_events" ADD CONSTRAINT "custom_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icals" ADD CONSTRAINT "icals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icals" ADD CONSTRAINT "icals_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_course_map" ADD CONSTRAINT "schedule_course_map_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_course_map" ADD CONSTRAINT "schedule_course_map_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_event_map" ADD CONSTRAINT "schedule_event_map_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_event_map" ADD CONSTRAINT "schedule_event_map_custom_event_id_custom_events_id_fk" FOREIGN KEY ("custom_event_id") REFERENCES "public"."custom_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;