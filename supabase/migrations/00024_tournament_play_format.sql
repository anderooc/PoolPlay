-- Tournament-wide play structure (pool → bracket, single elim, etc.).
-- All pools in a tournament share this format.
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS play_format public.division_format NOT NULL DEFAULT 'pool_to_bracket';
