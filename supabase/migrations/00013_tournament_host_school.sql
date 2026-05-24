-- Tournaments are hosted by a school (not an individual team).
ALTER TABLE tournaments
  ADD COLUMN host_school_id uuid REFERENCES schools(id) ON DELETE SET NULL;

UPDATE tournaments t
SET host_school_id = tm.school_id
FROM teams tm
WHERE t.host_team_id = tm.id AND tm.school_id IS NOT NULL;

ALTER TABLE tournaments DROP COLUMN host_team_id;

CREATE INDEX tournaments_host_school_id_idx ON tournaments (host_school_id);
