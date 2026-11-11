CREATE TYPE "public"."connection_status" AS ENUM('active', 'needs_reconnect', 'disconnected');--> statement-breakpoint
CREATE TABLE "connections" (
	"netid" text PRIMARY KEY NOT NULL,
	"status" "connection_status" DEFAULT 'active' NOT NULL,
	"sealed_session" text NOT NULL,
	"cas_expires_at" timestamp with time zone,
	"stellic_expires_at" timestamp with time zone,
	"last_refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
