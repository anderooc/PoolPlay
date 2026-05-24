ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "gender" "team_gender";--> statement-breakpoint
UPDATE "schools" SET "gender" = 'mens' WHERE "gender" IS NULL;--> statement-breakpoint
ALTER TABLE "schools" ALTER COLUMN "gender" SET NOT NULL;
