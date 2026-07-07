import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// postgres.js keeps a connection *pool*. `max` is kept moderate so pages
// that fan out reads with Promise.all do not open a burst of simultaneous
// connections to the Supabase transaction pooler (port 6543), which can hit
// CONNECT_TIMEOUT under load. Extra queries queue on the pool instead.
//
// `prepare: false` is required for the Supabase transaction pooler, which
// cannot reuse named prepared statements across pooled connections.
const client = postgres(connectionString, {
  prepare: false,
  max: 6,
  idle_timeout: 20,
  connect_timeout: 30,
});

export const db = drizzle(client, { schema });
