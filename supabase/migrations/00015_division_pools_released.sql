-- Hosts can hide pool play (standings, matches, brackets) until explicitly released.
ALTER TABLE divisions
  ADD COLUMN IF NOT EXISTS pools_released_at timestamptz;
