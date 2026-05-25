import { redirect } from "next/navigation";
import { adminTabUrl, parseAdminPage } from "../constants";

interface Props {
  searchParams?: Promise<{ page?: string }>;
}

export default async function AdminTeamsRedirect({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const page = parseAdminPage(sp.page);
  redirect(adminTabUrl("teams", page > 1 ? page : undefined));
}
