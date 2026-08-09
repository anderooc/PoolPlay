-- ShootSet - Collegiate club volleyball tournament hub
-- Copyright (C) 2026 Andrew Chang
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.

-- Private trigger functions are never exposed through PostgREST.
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

-- Registration and waitlist mutations re-check the live account state while
-- holding database locks instead of trusting an earlier request snapshot.
ALTER TABLE public.users
  ADD COLUMN disabled_at timestamptz;

-- Preserve the actor and reason for registration creation or removal even
-- after the registration itself is deleted.
CREATE TABLE public.registration_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid
    REFERENCES public.registrations (id) ON DELETE SET NULL,
  tournament_id uuid NOT NULL
    REFERENCES public.tournaments (id) ON DELETE CASCADE,
  team_id uuid NOT NULL
    REFERENCES public.teams (id) ON DELETE CASCADE,
  from_status public.registration_status,
  to_status public.registration_status NOT NULL,
  actor_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  operation_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registration_status_events_team_operation_unique
    UNIQUE (tournament_id, team_id, operation_id)
);

CREATE INDEX registration_status_events_tournament_id_idx
  ON public.registration_status_events (tournament_id);
CREATE INDEX registration_status_events_registration_id_idx
  ON public.registration_status_events (registration_id);
CREATE INDEX registration_status_events_team_id_idx
  ON public.registration_status_events (team_id);
CREATE INDEX registration_status_events_actor_user_id_idx
  ON public.registration_status_events (actor_user_id);
CREATE INDEX registration_status_events_operation_id_idx
  ON public.registration_status_events (operation_id);

ALTER TABLE public.registration_status_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.registration_status_events
  FROM anon, authenticated;
