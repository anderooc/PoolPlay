-- Team gender & region; tournaments inherit from hosting team.

CREATE TYPE team_gender AS ENUM ('mens', 'womens');
CREATE TYPE team_region AS ENUM ('north', 'central', 'south', 'southeast');

ALTER TABLE teams
  ADD COLUMN gender team_gender NOT NULL DEFAULT 'mens',
  ADD COLUMN region team_region NOT NULL DEFAULT 'south';

ALTER TABLE teams ALTER COLUMN gender DROP DEFAULT;
ALTER TABLE teams ALTER COLUMN region DROP DEFAULT;

ALTER TABLE tournaments
  ADD COLUMN host_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  ADD COLUMN gender team_gender NOT NULL DEFAULT 'mens',
  ADD COLUMN region team_region NOT NULL DEFAULT 'south';

ALTER TABLE tournaments ALTER COLUMN gender DROP DEFAULT;
ALTER TABLE tournaments ALTER COLUMN region DROP DEFAULT;

-- Same school may field separate men's and women's teams.
CREATE UNIQUE INDEX teams_name_university_gender_unique
  ON teams (name, university, gender);

CREATE INDEX tournaments_gender_region_idx ON tournaments (gender, region);
CREATE INDEX tournaments_host_team_id_idx ON tournaments (host_team_id);
