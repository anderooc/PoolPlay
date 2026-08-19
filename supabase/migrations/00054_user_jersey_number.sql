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

-- Preferred jersey lives on users and is copied onto every team_members row
-- for that person. Team rosters cannot share a number. School rosters also
-- cannot share a number (enforced in application writes after this backfill).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS jersey_number integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_jersey_number_range'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_jersey_number_range
      CHECK (
        jersey_number IS NULL
        OR (jersey_number >= 0 AND jersey_number <= 99)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_members_jersey_number_range'
  ) THEN
    ALTER TABLE public.team_members
      ADD CONSTRAINT team_members_jersey_number_range
      CHECK (
        jersey_number IS NULL
        OR (jersey_number >= 0 AND jersey_number <= 99)
      );
  END IF;
END
$$;

-- One preferred number per user: the most recently assigned team jersey.
UPDATE public.users AS u
SET jersey_number = src.jersey_number
FROM (
  SELECT DISTINCT ON (team_members.user_id)
    team_members.user_id,
    team_members.jersey_number
  FROM public.team_members
  WHERE team_members.jersey_number IS NOT NULL
  ORDER BY team_members.user_id, team_members.created_at DESC, team_members.id DESC
) AS src
WHERE u.id = src.user_id
  AND u.jersey_number IS NULL;

-- Keep the earliest school member when two people already share a number.
WITH ranked AS (
  SELECT
    school_members.user_id,
    row_number() OVER (
      PARTITION BY school_members.school_id, users.jersey_number
      ORDER BY school_members.joined_at ASC, school_members.user_id ASC
    ) AS rn
  FROM public.school_members
  INNER JOIN public.users ON users.id = school_members.user_id
  WHERE users.jersey_number IS NOT NULL
)
UPDATE public.users
SET jersey_number = NULL
FROM ranked
WHERE users.id = ranked.user_id
  AND ranked.rn > 1;

-- Keep the earliest team member when two people on the same team share a number.
WITH ranked AS (
  SELECT
    team_members.user_id,
    row_number() OVER (
      PARTITION BY team_members.team_id, users.jersey_number
      ORDER BY team_members.created_at ASC, team_members.user_id ASC
    ) AS rn
  FROM public.team_members
  INNER JOIN public.users ON users.id = team_members.user_id
  WHERE users.jersey_number IS NOT NULL
)
UPDATE public.users
SET jersey_number = NULL
FROM ranked
WHERE users.id = ranked.user_id
  AND ranked.rn > 1;

UPDATE public.team_members AS team_members
SET jersey_number = users.jersey_number
FROM public.users
WHERE team_members.user_id = users.id
  AND team_members.jersey_number IS DISTINCT FROM users.jersey_number;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_team_jersey_unique
  ON public.team_members (team_id, jersey_number)
  WHERE jersey_number IS NOT NULL;
