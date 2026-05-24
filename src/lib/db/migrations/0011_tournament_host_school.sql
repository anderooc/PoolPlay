ALTER TABLE "tournaments" ADD COLUMN "host_school_id" uuid;--> statement-breakpoint
UPDATE "tournaments" t
SET "host_school_id" = tm."school_id"
FROM "teams" tm
WHERE t."host_team_id" = tm."id" AND tm."school_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" DROP CONSTRAINT IF EXISTS "tournaments_host_team_id_teams_id_fk";--> statement-breakpoint
ALTER TABLE "tournaments" DROP COLUMN "host_team_id";--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_host_school_id_schools_id_fk" FOREIGN KEY ("host_school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tournaments_host_school_id_idx" ON "tournaments" USING btree ("host_school_id");
