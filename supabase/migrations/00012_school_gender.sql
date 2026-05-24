-- Schools represent a club program for a single gender; teams inherit it.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS gender public.team_gender;

UPDATE public.schools SET gender = 'mens' WHERE gender IS NULL;

ALTER TABLE public.schools ALTER COLUMN gender SET NOT NULL;
