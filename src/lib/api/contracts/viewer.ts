/*
 * brackt - Collegiate club volleyball tournament hub
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

import type {
  UserPlayerGender,
  UserRole,
  VolleyballPosition,
} from "@/types";

/**
 * The authenticated caller's own profile.
 *
 * Fields are listed explicitly rather than spread from the database row: the
 * schema is still changing weekly, and a released app binary must not start
 * receiving new or renamed columns it was never built to parse. `authId` and
 * `disabledAt` are deliberately absent — the first is an internal join key, the
 * second is unreachable because disabled callers are rejected at the boundary.
 */
export interface ViewerContract {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  university: string | null;
  avatarUrl: string | null;
  playerGender: UserPlayerGender | null;
  volleyballPosition: VolleyballPosition | null;
  jerseyNumber: number | null;
  displayEmail: string | null;
  displaySchool: string | null;
  createdAt: string;
}
