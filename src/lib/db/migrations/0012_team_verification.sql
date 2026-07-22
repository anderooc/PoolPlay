-- ShootSet - Collegiate club volleyball tournament hub
-- Copyright (C) 2026 Andrew Chang
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

CREATE TYPE "public"."team_verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "verification_status" "team_verification_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "verified_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "teams" SET "verification_status" = 'verified' WHERE "school_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teams_verification_status_idx" ON "teams" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teams_standalone_pending_idx" ON "teams" USING btree ("verification_status") WHERE "school_id" IS NULL;
