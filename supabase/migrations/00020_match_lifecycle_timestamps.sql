-- Match lifecycle timestamps
-- Adds explicit warmup/start tracking to matches so refs can run the
-- warmup countdown and start play independently of the planned
-- `scheduled_time`. The "warmup" phase is derived in app code as
-- (warmup_started_at IS NOT NULL AND status = 'upcoming').
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run
-- Or apply via: npm run db:push

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS warmup_started_at timestamp,
  ADD COLUMN IF NOT EXISTS started_at timestamp;
