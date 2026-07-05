-- Bracket tier settings live on the tournament: all pools combine into one
-- gold / silver / bronze structure after pool play.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS bracket_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS gold_team_count integer;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS silver_team_count integer;

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_bracket_count_check;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_bracket_count_check
  CHECK (bracket_count >= 1 AND bracket_count <= 3);

-- Prefer any division-level settings already configured.
UPDATE public.tournaments t
SET
  bracket_count = d.bracket_count,
  gold_team_count = d.gold_team_count,
  silver_team_count = d.silver_team_count
FROM (
  SELECT DISTINCT ON (tournament_id)
    tournament_id,
    bracket_count,
    gold_team_count,
    silver_team_count
  FROM public.divisions
  WHERE format = 'pool_to_bracket'
  ORDER BY tournament_id, created_at ASC
) d
WHERE t.id = d.tournament_id;

COMMENT ON COLUMN public.tournaments.bracket_count IS
  'Elimination brackets after pool play (1–3). All pools combine into these tiers.';
