/**
 * Temporary end-to-end check for the bearer-token path on /api/v1/me.
 *
 * Creates a throwaway Supabase auth user, signs in to obtain a real access
 * token, calls the API with it, then removes both the auth user and the
 * application row that the request auto-creates. Delete this file once the
 * mobile client can exercise the same path.
 *
 * Usage: npx tsx scripts/verify-bearer-auth.mts [baseUrl]
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

const BASE_URL = process.argv[2] ?? "http://127.0.0.1:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY || !DATABASE_URL) {
  console.error("Missing required env vars in .env.local");
  process.exit(1);
}

const email = `brackt-api-check-${Date.now()}@example.edu`;
const password = `Tmp!${Math.random().toString(36).slice(2)}Aa1`;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let authUserId: string | null = null;
let failed = false;

function check(label: string, condition: boolean, detail?: unknown) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) {
    failed = true;
    if (detail !== undefined) console.log("      got:", detail);
  }
}

try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "API Check", university: "Example University" },
  });
  if (created.error) throw created.error;
  authUserId = created.data.user.id;
  console.log(`Created throwaway auth user ${authUserId}\n`);

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedIn = await anon.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  const accessToken = signedIn.data.session!.access_token;

  // The happy path: a real token should return this user's own profile.
  const authed = await fetch(`${BASE_URL}/api/v1/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await authed.json();

  check("authenticated GET /api/v1/me returns 200", authed.status === 200, authed.status);
  check("response is wrapped in the versioned envelope", body?.meta?.version === "v1", body?.meta);
  check("returns the caller's own email", body?.data?.email === email, body?.data?.email);
  check("defaults a new account to the player role", body?.data?.role === "player", body?.data?.role);
  check("carries user_metadata through to the profile", body?.data?.university === "Example University", body?.data?.university);
  check("never exposes the internal auth id", body?.data?.authId === undefined, body?.data?.authId);
  check("never exposes disabledAt", body?.data?.disabledAt === undefined, body?.data?.disabledAt);
  check("marks the response uncacheable", authed.headers.get("cache-control") === "no-store, private", authed.headers.get("cache-control"));

  // A token that is well-formed but signed by nobody must not be accepted.
  const tampered = accessToken.slice(0, -4) + "AAAA";
  const forged = await fetch(`${BASE_URL}/api/v1/me`, {
    headers: { Authorization: `Bearer ${tampered}` },
  });
  check("rejects a tampered signature with 401", forged.status === 401, forged.status);

  console.log("\nProfile returned:");
  console.log(JSON.stringify(body.data, null, 2));
} catch (cause) {
  failed = true;
  console.error("\nUnexpected failure:", cause);
} finally {
  // Cleanup runs even on failure so a throwaway account is never left behind.
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    if (authUserId) {
      const deleted = await sql`
        DELETE FROM public.users WHERE auth_id = ${authUserId} RETURNING id
      `;
      console.log(`\nRemoved ${deleted.length} application user row(s)`);
      const { error } = await admin.auth.admin.deleteUser(authUserId);
      console.log(
        error
          ? `Failed to delete auth user ${authUserId}: ${error.message}`
          : `Removed throwaway auth user ${authUserId}`
      );
    }
  } finally {
    await sql.end();
  }
}

process.exit(failed ? 1 : 0);
