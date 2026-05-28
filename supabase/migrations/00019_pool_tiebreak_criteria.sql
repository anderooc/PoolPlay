-- Tournament-wide pool standings / seeding tie-break criteria.
-- Stored as an ordered JSON array of keys.
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS pool_tiebreak_criteria jsonb
    NOT NULL
    DEFAULT '["match_record","set_record","point_diff","head_to_head"]'::jsonb;

