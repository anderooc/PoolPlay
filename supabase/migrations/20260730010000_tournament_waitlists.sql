CREATE TYPE public.waitlist_entry_status AS ENUM (
  'waiting', 'promoted', 'withdrawn', 'removed'
);

ALTER TABLE public.tournaments
  ADD COLUMN registration_capacity integer,
  ADD COLUMN registration_deadline timestamptz,
  ADD CONSTRAINT tournaments_registration_capacity_positive
    CHECK (registration_capacity IS NULL OR registration_capacity > 0);

CREATE TABLE public.tournament_waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL
    REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  queue_position bigserial NOT NULL,
  requested_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  request_operation_id uuid NOT NULL,
  status public.waitlist_entry_status NOT NULL DEFAULT 'waiting',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_operation_id uuid,
  registration_id uuid
    REFERENCES public.registrations(id) ON DELETE SET NULL,
  CONSTRAINT tournament_waitlist_entries_resolution_consistent CHECK (
    (
      status = 'waiting'
      AND resolved_at IS NULL
      AND resolved_by_user_id IS NULL
      AND resolution_operation_id IS NULL
      AND registration_id IS NULL
    )
    OR (
      status = 'promoted'
      AND resolved_at IS NOT NULL
      AND resolution_operation_id IS NOT NULL
    )
    OR (
      status IN ('withdrawn', 'removed')
      AND resolved_at IS NOT NULL
      AND resolution_operation_id IS NOT NULL
      AND registration_id IS NULL
    )
  )
);

CREATE UNIQUE INDEX tournament_waitlist_entries_waiting_team_unique
  ON public.tournament_waitlist_entries (tournament_id, team_id)
  WHERE status = 'waiting';
CREATE INDEX tournament_waitlist_entries_fifo_idx
  ON public.tournament_waitlist_entries (tournament_id, queue_position)
  WHERE status = 'waiting';
CREATE INDEX tournament_waitlist_entries_team_id_idx
  ON public.tournament_waitlist_entries (team_id);
CREATE INDEX tournament_waitlist_entries_requested_by_user_id_idx
  ON public.tournament_waitlist_entries (requested_by_user_id);
CREATE INDEX tournament_waitlist_entries_resolved_by_user_id_idx
  ON public.tournament_waitlist_entries (resolved_by_user_id);
CREATE UNIQUE INDEX tournament_waitlist_entries_request_operation_unique
  ON public.tournament_waitlist_entries (
    tournament_id, team_id, request_operation_id
  );
CREATE UNIQUE INDEX tournament_waitlist_entries_resolution_operation_unique
  ON public.tournament_waitlist_entries (
    tournament_id, resolution_operation_id
  )
  WHERE resolution_operation_id IS NOT NULL;
CREATE UNIQUE INDEX tournament_waitlist_entries_registration_unique
  ON public.tournament_waitlist_entries (registration_id)
  WHERE registration_id IS NOT NULL;
ALTER TABLE public.tournament_waitlist_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tournament_waitlist_entries FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.tournament_waitlist_entries_queue_position_seq
  FROM anon, authenticated;

CREATE OR REPLACE FUNCTION
  app_private.enforce_waitlist_registration_ownership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'registrations' THEN
    IF EXISTS (
      SELECT 1
      FROM public.tournament_waitlist_entries waitlist_entry
      WHERE waitlist_entry.registration_id = OLD.id
        AND (
          waitlist_entry.tournament_id <> NEW.tournament_id
          OR waitlist_entry.team_id <> NEW.team_id
        )
    ) THEN
      RAISE EXCEPTION
        'Linked waitlist registration ownership cannot change'
        USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.registration_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM registration_row.id
  FROM public.registrations registration_row
  WHERE registration_row.id = NEW.registration_id
    AND registration_row.tournament_id = NEW.tournament_id
    AND registration_row.team_id = NEW.team_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Waitlist registration must belong to the same tournament and team'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION
  app_private.enforce_waitlist_registration_ownership()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tournament_waitlist_entries_enforce_registration_ownership
BEFORE INSERT OR UPDATE OF registration_id, tournament_id, team_id
ON public.tournament_waitlist_entries
FOR EACH ROW
EXECUTE FUNCTION app_private.enforce_waitlist_registration_ownership();

CREATE TRIGGER registrations_enforce_waitlist_ownership
BEFORE UPDATE OF tournament_id, team_id
ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION app_private.enforce_waitlist_registration_ownership();
