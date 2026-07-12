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

-- Team gender & region; tournaments inherit from hosting team.

CREATE TYPE "public"."team_gender" AS ENUM('mens', 'womens');--> statement-breakpoint
CREATE TYPE "public"."team_region" AS ENUM('north', 'central', 'south', 'southeast');--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "gender" "team_gender" DEFAULT 'mens' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "region" "team_region" DEFAULT 'south' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "gender" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "region" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "host_team_id" uuid;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "gender" "team_gender" DEFAULT 'mens' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "region" "team_region" DEFAULT 'south' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "gender" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tournaments" ALTER COLUMN "region" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_host_team_id_teams_id_fk" FOREIGN KEY ("host_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "teams_name_university_gender_unique" ON "teams" USING btree ("name","university","gender");--> statement-breakpoint
CREATE INDEX "tournaments_gender_region_idx" ON "tournaments" USING btree ("gender","region");--> statement-breakpoint
CREATE INDEX "tournaments_host_team_id_idx" ON "tournaments" USING btree ("host_team_id");
