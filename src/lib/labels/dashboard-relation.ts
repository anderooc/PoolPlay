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

/** How the current user relates to a tournament on the dashboard. */
export type DashboardTournamentRelation =
  | "pending"
  | "signed_up"
  | "past"
  | "hosting";

export function dashboardRelationLabel(
  relation: DashboardTournamentRelation
): string {
  switch (relation) {
    case "pending":
      return "Pending acceptance";
    case "signed_up":
      return "Signed up";
    case "past":
      return "Past";
    case "hosting":
      return "Hosting";
  }
}
