-- Tournament-wide match format settings drive scoring defaults and auto-finalization.
-- play_all_3:        play all 3 sets regardless of standing (common 3-team pool format)
-- best_of_2:         play exactly 2 sets, ties allowed (broken by points in standings)
-- two_with_tiebreak: play 2 sets; if 1-1, play a 3rd tiebreak set
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_format') THEN
    CREATE TYPE public.match_format AS ENUM (
      'play_all_3',
      'best_of_2',
      'two_with_tiebreak'
    );
  END IF;
END $$;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS match_format public.match_format
    NOT NULL DEFAULT 'two_with_tiebreak',
  ADD COLUMN IF NOT EXISTS set_starting_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS set_target_score integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS tiebreak_target_score integer NOT NULL DEFAULT 15;
