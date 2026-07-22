/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
