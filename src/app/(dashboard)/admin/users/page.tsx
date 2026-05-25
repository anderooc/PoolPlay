import { redirect } from "next/navigation";
import { adminTabUrl, parseAdminPage } from "../constants";

interface Props {
  searchParams?: Promise<{ page?: string }>;
}

export default async function AdminUsersRedirect({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const page = parseAdminPage(sp.page);
  redirect(adminTabUrl("users", page > 1 ? page : undefined));
}
