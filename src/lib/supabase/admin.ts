import { createClient } from "@supabase/supabase-js";

/** Server-only Supabase client for storage and admin operations. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for tournament waiver file storage."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const TOURNAMENT_WAIVER_BUCKET = "tournament-waivers";

export const WAIVER_MAX_BYTES = 10 * 1024 * 1024;
