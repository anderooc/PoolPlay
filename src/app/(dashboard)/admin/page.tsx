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

import type { Metadata } from "next";
import {
  ADMIN_TAB_LABELS,
  DEFAULT_ADMIN_TAB,
  parseAdminPage,
  parseAdminTab,
} from "./constants";
import { pageMetadata, pageTitle } from "@/lib/metadata";
import { AdminOverviewPanel } from "./panels/overview-panel";
import { AdminUsersPanel } from "./panels/users-panel";
import { AdminTournamentsPanel } from "./panels/tournaments-panel";
import { AdminSchoolsPanel } from "./panels/schools-panel";
import { AdminTeamsPanel } from "./panels/teams-panel";
import { AdminFlagsPanel } from "./panels/flags-panel";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: Promise<{ tab?: string; page?: string }>;
}

export async function generateMetadata({
  searchParams,
}: Pick<Props, "searchParams">): Promise<Metadata> {
  const sp = (await searchParams) ?? {};
  const tab = parseAdminTab(sp.tab);
  if (tab === DEFAULT_ADMIN_TAB) {
    return pageMetadata("Admin");
  }
  return pageMetadata(pageTitle(ADMIN_TAB_LABELS[tab], "Admin"));
}

export default async function AdminPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const tab = parseAdminTab(sp.tab);
  const page = parseAdminPage(sp.page);

  switch (tab) {
    case "users":
      return <AdminUsersPanel page={page} />;
    case "tournaments":
      return <AdminTournamentsPanel page={page} />;
    case "schools":
      return <AdminSchoolsPanel page={page} />;
    case "teams":
      return <AdminTeamsPanel page={page} />;
    case "flags":
      return <AdminFlagsPanel page={page} />;
    case "overview":
    default:
      return <AdminOverviewPanel />;
  }
}
