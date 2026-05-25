import { parseAdminPage, parseAdminTab } from "./constants";
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
