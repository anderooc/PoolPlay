CREATE TYPE "public"."team_verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "verification_status" "team_verification_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "verified_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "teams" SET "verification_status" = 'verified' WHERE "school_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teams_verification_status_idx" ON "teams" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teams_standalone_pending_idx" ON "teams" USING btree ("verification_status") WHERE "school_id" IS NULL;
