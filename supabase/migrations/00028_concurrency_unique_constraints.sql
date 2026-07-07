-- One row per set per match; one registration per team per tournament.
-- Remove duplicates first so the unique indexes can be applied safely.

DELETE FROM sets a
USING sets b
WHERE a.match_id = b.match_id
  AND a.set_number = b.set_number
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS sets_match_set_number_unique
  ON sets (match_id, set_number);

DELETE FROM registrations a
USING registrations b
WHERE a.team_id = b.team_id
  AND a.tournament_id = b.tournament_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS registrations_team_tournament_unique
  ON registrations (team_id, tournament_id);
