-- Tournaments are single-day events: one date column, no end date.
ALTER TABLE tournaments DROP COLUMN IF EXISTS end_date;
ALTER TABLE tournaments RENAME COLUMN start_date TO date;
