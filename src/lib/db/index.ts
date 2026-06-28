import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// postgres.js keeps a connection *pool*, so `Promise.all` of independent
// queries fans out across connections rather than serializing on one — this is
// how most pages in the app already batch their reads. `max` is set explicitly
// to give parallel reads clear headroom (the Supabase transaction pooler
// handles many short-lived client connections comfortably). `idle_timeout`
// reaps idle connections so we don't hold pooler slots open between requests.
//
// `prepare: false` is required for the Supabase transaction pooler (port 6543),
// which cannot reuse named prepared statements across pooled connections.
const client = postgres(connectionString, {
  prepare: false,
  max: 15,
  idle_timeout: 20,
});

export const db = drizzle(client, { schema });
