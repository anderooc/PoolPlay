-- Add admin role + content_flags audit table.
--
-- The admin role gates the /admin section of the dashboard. The first
-- admin is bootstrapped automatically on login via ADMIN_EMAILS env var
-- (see src/lib/auth.ts), and admins can promote others from the UI.
--
-- content_flags logs any text input that hit the content filter so admins
-- can review borderline cases instead of just rejecting them silently.

-- Postgres requires ADD VALUE to commit before being referenced in queries
-- in the same transaction, so this statement must run on its own.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

CREATE TABLE IF NOT EXISTS public.content_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  area text NOT NULL,
  text text NOT NULL,
  blocked_word text NOT NULL,
  resolved_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_flags_created_at_idx
  ON public.content_flags (created_at DESC);

CREATE INDEX IF NOT EXISTS content_flags_user_id_idx
  ON public.content_flags (user_id);

-- RLS: writes go through Drizzle (postgres role) which bypasses RLS.
-- We never expose this table to the browser Supabase client.
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;
