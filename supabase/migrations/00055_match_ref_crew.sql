-- Per-match ref crew check-in and designated point keeper.

CREATE TYPE public.match_ref_crew_role AS ENUM (
  'up_ref',
  'down_ref',
  'line_ref_1',
  'line_ref_2',
  'scorekeeper_1',
  'scorekeeper_2',
  'scorekeeper_3'
);

CREATE TABLE public.match_ref_crew (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  role public.match_ref_crew_role NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_ref_crew_match_role_unique UNIQUE (match_id, role),
  CONSTRAINT match_ref_crew_match_user_unique UNIQUE (match_id, user_id)
);

CREATE INDEX match_ref_crew_match_id_idx ON public.match_ref_crew (match_id);
CREATE INDEX match_ref_crew_user_id_idx ON public.match_ref_crew (user_id);

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS point_keeper_user_id uuid
    REFERENCES public.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS matches_point_keeper_user_id_idx
  ON public.matches (point_keeper_user_id);
