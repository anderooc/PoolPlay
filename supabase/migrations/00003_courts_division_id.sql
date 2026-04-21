-- Optional division scope for courts (shared across divisions when null).
ALTER TABLE public.courts
  ADD COLUMN division_id uuid REFERENCES public.divisions (id) ON DELETE SET NULL;
