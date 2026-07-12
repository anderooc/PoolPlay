-- PoolPlay - Collegiate club volleyball tournament hub
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

CREATE TYPE "public"."school_member_role" AS ENUM('president', 'officer', 'member');--> statement-breakpoint
CREATE TYPE "public"."school_verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schools" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "university" text NOT NULL,
  "region" "team_region" NOT NULL,
  "description" text,
  "website_url" text,
  "domain_hint" text,
  "verification_status" "school_verification_status" DEFAULT 'pending' NOT NULL,
  "domain_matched" boolean DEFAULT false NOT NULL,
  "verified_at" timestamp,
  "verified_by_user_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "schools_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "school_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" "school_member_role" DEFAULT 'member' NOT NULL,
  "title" text,
  "joined_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "school_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "schools" ADD CONSTRAINT "schools_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "school_members" ADD CONSTRAINT "school_members_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "school_members" ADD CONSTRAINT "school_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "teams" ADD CONSTRAINT "teams_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "school_members_school_user_unique" ON "school_members" USING btree ("school_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "school_members_one_president_per_school" ON "school_members" USING btree ("school_id") WHERE "role" = 'president';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "school_members_user_id_idx" ON "school_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schools_verification_status_idx" ON "schools" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schools_university_idx" ON "schools" USING btree ("university");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teams_school_id_idx" ON "teams" USING btree ("school_id");
