CREATE TYPE public.team_verification_status AS ENUM ('pending', 'verified', 'rejected');

ALTER TABLE public.teams
  ADD COLUMN verification_status public.team_verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN verified_by_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL;

UPDATE public.teams
SET verification_status = 'verified'
WHERE school_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS teams_verification_status_idx
  ON public.teams (verification_status);

CREATE INDEX IF NOT EXISTS teams_standalone_pending_idx
  ON public.teams (verification_status)
  WHERE school_id IS NULL;
