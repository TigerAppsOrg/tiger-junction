ALTER TABLE "connections" ADD COLUMN "refresh_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "next_refresh_at" timestamp with time zone;