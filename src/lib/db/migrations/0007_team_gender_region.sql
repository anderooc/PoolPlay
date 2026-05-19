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
