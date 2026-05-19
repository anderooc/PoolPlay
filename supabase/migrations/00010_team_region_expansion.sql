-- Additional team/tournament regions (enum values are append-only in Postgres).

ALTER TYPE team_region ADD VALUE IF NOT EXISTS 'northeast';
ALTER TYPE team_region ADD VALUE IF NOT EXISTS 'northwest';
ALTER TYPE team_region ADD VALUE IF NOT EXISTS 'east_central';

-- East and West regions.

ALTER TYPE team_region ADD VALUE IF NOT EXISTS 'east';
ALTER TYPE team_region ADD VALUE IF NOT EXISTS 'west';