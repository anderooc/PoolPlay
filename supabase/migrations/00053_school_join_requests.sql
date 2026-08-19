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

-- Users with a matching school email can request to join a school's master
-- roster. Presidents and officers approve those requests.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'school_join_request_status'
  ) THEN
    CREATE TYPE school_join_request_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'cancelled'
    );
  END IF;
END $$;

ALTER TYPE user_notification_kind ADD VALUE IF NOT EXISTS 'school_join_request';
ALTER TYPE user_notification_kind ADD VALUE IF NOT EXISTS 'school_join_update';

CREATE TABLE IF NOT EXISTS school_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status school_join_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS school_join_requests_pending_school_user_unique
  ON school_join_requests (school_id, user_id)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS school_join_requests_pending_user_unique
  ON school_join_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS school_join_requests_school_pending_idx
  ON school_join_requests (school_id, created_at DESC)
  WHERE status = 'pending';

ALTER TABLE school_join_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.school_join_requests FROM anon, authenticated;
