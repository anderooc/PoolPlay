-- Foreign-key indexes for frequently-filtered columns.
-- PostgreSQL does not create indexes for FKs automatically; these were
-- missing and caused sequential scans on the tournament detail page, the
-- registration flow, and auto-scheduling queries as data grew.

CREATE INDEX IF NOT EXISTS divisions_tournament_id_idx
  ON divisions (tournament_id);

CREATE INDEX IF NOT EXISTS courts_tournament_id_idx
  ON courts (tournament_id);

CREATE INDEX IF NOT EXISTS registrations_tournament_id_idx
  ON registrations (tournament_id);

CREATE INDEX IF NOT EXISTS registrations_team_id_idx
  ON registrations (team_id);

CREATE INDEX IF NOT EXISTS registrations_division_id_idx
  ON registrations (division_id);

CREATE INDEX IF NOT EXISTS court_divisions_court_id_idx
  ON court_divisions (court_id);

CREATE INDEX IF NOT EXISTS court_divisions_division_id_idx
  ON court_divisions (division_id);

CREATE INDEX IF NOT EXISTS team_members_user_id_idx
  ON team_members (user_id);

CREATE INDEX IF NOT EXISTS team_members_team_id_idx
  ON team_members (team_id);

CREATE INDEX IF NOT EXISTS pools_division_id_idx
  ON pools (division_id);

CREATE INDEX IF NOT EXISTS brackets_division_id_idx
  ON brackets (division_id);

CREATE INDEX IF NOT EXISTS pool_teams_pool_id_idx
  ON pool_teams (pool_id);

CREATE INDEX IF NOT EXISTS pool_teams_team_id_idx
  ON pool_teams (team_id);

CREATE INDEX IF NOT EXISTS matches_pool_id_idx
  ON matches (pool_id);

CREATE INDEX IF NOT EXISTS matches_bracket_id_idx
  ON matches (bracket_id);

CREATE INDEX IF NOT EXISTS matches_court_id_idx
  ON matches (court_id);

CREATE INDEX IF NOT EXISTS sets_match_id_idx
  ON sets (match_id);
