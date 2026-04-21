-- Many-to-many courts ↔ divisions (replaces single courts.division_id).
CREATE TABLE IF NOT EXISTS public.court_divisions (
  court_id uuid NOT NULL REFERENCES public.courts (id) ON DELETE CASCADE,
  division_id uuid NOT NULL REFERENCES public.divisions (id) ON DELETE CASCADE,
  PRIMARY KEY (court_id, division_id)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courts' AND column_name = 'division_id'
  ) THEN
    INSERT INTO public.court_divisions (court_id, division_id)
    SELECT id, division_id FROM public.courts WHERE division_id IS NOT NULL
    ON CONFLICT (court_id, division_id) DO NOTHING;
    ALTER TABLE public.courts DROP COLUMN division_id;
  END IF;
END$$;

ALTER TABLE public.court_divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "court_divisions_select_authenticated"
  ON public.court_divisions FOR SELECT TO authenticated USING (true);
