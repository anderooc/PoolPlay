-- Team cap was only used to estimate empty bracket skeleton size; brackets
-- resize from actual pool standings when play completes.
ALTER TABLE public.divisions DROP COLUMN IF EXISTS team_cap;
