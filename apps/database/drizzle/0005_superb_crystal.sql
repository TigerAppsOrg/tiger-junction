ALTER TABLE "sections" ALTER COLUMN "num" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."courses" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."sections" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."status";--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('open', 'closed', 'canceled');--> statement-breakpoint
ALTER TABLE "public"."courses" ALTER COLUMN "status" SET DATA TYPE "public"."status" USING "status"::"public"."status";--> statement-breakpoint
ALTER TABLE "public"."sections" ALTER COLUMN "status" SET DATA TYPE "public"."status" USING "status"::"public"."status";