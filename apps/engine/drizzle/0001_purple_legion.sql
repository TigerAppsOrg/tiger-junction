ALTER TABLE "users" ADD COLUMN "supabase_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_supabase_id_unique" UNIQUE("supabase_id");