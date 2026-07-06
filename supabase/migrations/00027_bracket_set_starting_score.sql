-- Bracket elimination sets start at 0–0; pool play may use a different starting score.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS bracket_set_starting_score integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tournaments.bracket_set_starting_score IS
  'Starting score per set for bracket matches (pool play uses set_starting_score).';
