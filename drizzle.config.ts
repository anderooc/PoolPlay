import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Same env loading as `next dev` / `next build` (.env, .env.local, etc.)
const projectRoot = process.cwd();
loadEnvConfig(projectRoot);

/**
 * Supabase + drizzle-kit: introspection often hangs if SSL is not set, or if you use
 * the transaction pooler (port 6543). Prefer the direct Postgres URL (port 5432, host
 * db.<project-ref>.supabase.co) for db:push only — see Supabase → Settings → Database.
 *
 * Optional: set DRIZZLE_DATABASE_URL to that direct URL while keeping DATABASE_URL
 * as the pooler for the running app.
 */
function augmentPostgresUrl(connectionString: string): string {
  try {
    const u = new URL(connectionString);
    if (!u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    if (!u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", "15");
    }
    return u.toString();
  } catch {
    const sep = connectionString.includes("?") ? "&" : "?";
    return `${connectionString}${sep}sslmode=require&connect_timeout=15`;
  }
}

const rawUrl =
  process.env.DRIZZLE_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!rawUrl) {
  throw new Error(
    [
      "No database URL for Drizzle.",
      "Set DATABASE_URL or DRIZZLE_DATABASE_URL in .env.local (project root:",
      `${path.resolve(projectRoot)}).`,
    ].join(" ")
  );
}

const databaseUrl = augmentPostgresUrl(rawUrl);

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
