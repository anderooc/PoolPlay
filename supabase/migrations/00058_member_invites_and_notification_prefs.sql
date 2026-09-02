-- brackt - Collegiate club volleyball tournament hub
-- Copyright (C) 2026 Andrew Chang
--
-- Member email invites and per-kind notification preferences.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'member_invite_status'
  ) THEN
    CREATE TYPE member_invite_status AS ENUM (
      'pending',
      'accepted',
      'expired',
      'revoked'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS member_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  role text NOT NULL,
  title text,
  invited_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  status member_invite_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_invites_target_check CHECK (
    (school_id IS NOT NULL AND team_id IS NULL)
    OR (school_id IS NULL AND team_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS member_invites_token_uidx
  ON member_invites (token);

CREATE INDEX IF NOT EXISTS member_invites_email_pending_idx
  ON member_invites (lower(email), status)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS member_invites_pending_school_email_uidx
  ON member_invites (school_id, lower(email))
  WHERE status = 'pending' AND school_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS member_invites_pending_team_email_uidx
  ON member_invites (team_id, lower(email))
  WHERE status = 'pending' AND team_id IS NOT NULL;

ALTER TABLE member_invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.member_invites FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind user_notification_kind NOT NULL,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, kind)
);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.user_notification_preferences FROM anon, authenticated;
