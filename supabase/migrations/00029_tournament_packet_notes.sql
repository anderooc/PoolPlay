ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS packet_notes text;
