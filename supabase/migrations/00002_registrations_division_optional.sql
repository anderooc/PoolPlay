-- Registrations can exist before an organizer assigns a division / pool.
ALTER TABLE public.registrations ALTER COLUMN division_id DROP NOT NULL;
