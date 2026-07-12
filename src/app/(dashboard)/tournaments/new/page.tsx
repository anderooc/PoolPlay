/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserHostingSchool } from "@/lib/schools/hosting";
import { NewTournamentForm } from "./new-tournament-form";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("New tournament");

export default async function NewTournamentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hostSchool = await getUserHostingSchool(user.id);

  return <NewTournamentForm hostSchool={hostSchool} />;
}
