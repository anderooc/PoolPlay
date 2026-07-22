-- PoolPlay - Collegiate club volleyball tournament hub
-- Copyright (C) 2026 Andrew Chang
--
-- Server-side, shared rate-limit counters for authentication actions. Browser
-- roles receive no table privileges; only the application's database role
-- reads or updates these rows.
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  key_hash text NOT NULL,
  scope text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  window_expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_hash, scope)
);

CREATE INDEX IF NOT EXISTS auth_rate_limits_expiry_idx
  ON public.auth_rate_limits (window_expires_at);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_rate_limits FROM anon, authenticated;
