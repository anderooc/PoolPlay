-- Track when organizers explicitly save pool / bracket settings panels.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS pool_settings_saved_at timestamptz;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS bracket_settings_saved_at timestamptz;

-- Tournaments that already generated pool matches have confirmed pool settings.
UPDATE public.tournaments t
SET pool_settings_saved_at = t.updated_at
WHERE t.pool_settings_saved_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.divisions d
    INNER JOIN public.pools p ON p.division_id = d.id
    INNER JOIN public.matches m ON m.pool_id = p.id
    WHERE d.tournament_id = t.id
  );

-- Single-bracket defaults or tier counts already configured.
UPDATE public.tournaments t
SET bracket_settings_saved_at = t.updated_at
WHERE t.bracket_settings_saved_at IS NULL
  AND (
    t.bracket_count <= 1
    OR (t.bracket_count >= 2 AND t.gold_team_count IS NOT NULL)
  );
