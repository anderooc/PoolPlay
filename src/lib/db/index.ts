import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// prepare: false — required for Supabase transaction pooler (port 6543).
// Avoid parallel Drizzle queries per request; one pooler connection cannot
// multiplex concurrent statements (see admin overview-panel).
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
