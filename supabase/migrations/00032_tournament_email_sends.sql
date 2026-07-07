CREATE TYPE tournament_email_audience AS ENUM (
  'captains_confirmed',
  'captains_all',
  'captains_pending',
  'captains_waiver_incomplete'
);

CREATE TYPE tournament_email_kind AS ENUM (
  'custom',
  'waiver_reminder'
);

CREATE TABLE IF NOT EXISTS tournament_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  sent_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kind tournament_email_kind NOT NULL,
  audience tournament_email_audience NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  recipient_count integer NOT NULL,
  skipped_no_captain_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tournament_email_sends_tournament_id_idx
  ON tournament_email_sends (tournament_id, sent_at DESC);
