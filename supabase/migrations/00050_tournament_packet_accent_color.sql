-- Add optional accent color for tournament packet PDFs
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS packet_accent_color text;
