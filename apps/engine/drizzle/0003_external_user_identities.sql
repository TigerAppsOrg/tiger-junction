CREATE TABLE IF NOT EXISTS "external_user_identities" (
  "id" serial PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "external_user_id" text NOT NULL,
  "engine_user_id" integer NOT NULL,
  "netid" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "external_user_identities"
  ADD CONSTRAINT "external_user_identities_engine_user_id_users_id_fk"
  FOREIGN KEY ("engine_user_id")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "external_user_identities_provider_external_user_id_idx"
  ON "external_user_identities" USING btree ("provider","external_user_id");
