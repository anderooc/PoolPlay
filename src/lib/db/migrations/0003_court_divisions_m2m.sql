-- brackt - Collegiate club volleyball tournament hub
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
