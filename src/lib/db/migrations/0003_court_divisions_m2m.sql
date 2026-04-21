-- Many-to-many courts ↔ divisions (replaces single courts.division_id).
CREATE TABLE IF NOT EXISTS "court_divisions" (
  "court_id" uuid NOT NULL REFERENCES "courts"("id") ON DELETE CASCADE,
  "division_id" uuid NOT NULL REFERENCES "divisions"("id") ON DELETE CASCADE,
  PRIMARY KEY ("court_id", "division_id")
);

-- Migrate legacy single-division assignment when present, then drop column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courts' AND column_name = 'division_id'
  ) THEN
    INSERT INTO "court_divisions" ("court_id", "division_id")
    SELECT "id", "division_id" FROM "courts" WHERE "division_id" IS NOT NULL
    ON CONFLICT ("court_id", "division_id") DO NOTHING;
    ALTER TABLE "courts" DROP COLUMN "division_id";
  END IF;
END$$;
