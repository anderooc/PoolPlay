-- Reffing/working team assigned to officiate a match. Defaults to lower-seeded
-- teams when distributing duties; the host can override per match.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS ref_team_id uuid
    REFERENCES public.teams (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS matches_ref_team_id_idx
  ON public.matches (ref_team_id);
