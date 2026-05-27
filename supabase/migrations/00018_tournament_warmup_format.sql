-- Tournament-wide warmup convention. Auto-scheduled matches reserve this
-- window before play time so the schedule reflects realistic court turnaround.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'warmup_format') THEN
    CREATE TYPE public.warmup_format AS ENUM (
      'none',
      'three_three_one'
    );
  END IF;
END $$;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS warmup_format public.warmup_format
    NOT NULL DEFAULT 'three_three_one';
