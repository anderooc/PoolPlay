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

-- Completes 00051 after a partial apply that already created user_notification_kind.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_notification_kind'
  ) THEN
    CREATE TYPE user_notification_kind AS ENUM (
      'tournament_posted',
      'tournament_message',
      'chat_announcement',
      'registration_update'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind user_notification_kind NOT NULL,
  title text NOT NULL,
  body text,
  href text,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx
  ON user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_notifications_user_unread_idx
  ON user_notifications (user_id)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS tournament_posting_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  sent_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  gender team_gender NOT NULL,
  regions team_region[] NOT NULL,
  send_email boolean NOT NULL DEFAULT true,
  recipient_count integer NOT NULL,
  skipped_no_captain_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tournament_posting_announcements_tournament_idx
  ON tournament_posting_announcements (tournament_id, sent_at DESC);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_posting_announcements ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.user_notifications FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.tournament_posting_announcements
  FROM anon, authenticated;
