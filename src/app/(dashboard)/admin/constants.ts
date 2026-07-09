/** Rows per page on admin list screens (users, tournaments, teams, flags). */
export const ADMIN_TABLE_PAGE_SIZE = 50;

/** Extra gap below table triggers for admin select dropdowns. */
export const ADMIN_SELECT_SIDE_OFFSET = 8;

export const ADMIN_TABS = [
  "overview",
  "users",
  "tournaments",
  "schools",
  "teams",
  "flags",
] as const;

export type AdminTabId = (typeof ADMIN_TABS)[number];

export const ADMIN_TAB_LABELS: Record<AdminTabId, string> = {
  overview: "Overview",
  users: "Users",
  tournaments: "Tournaments",
  schools: "Schools",
  teams: "Teams",
  flags: "Content flags",
};

export const DEFAULT_ADMIN_TAB: AdminTabId = "overview";

export function isAdminTabId(value: string | undefined): value is AdminTabId {
  return (
    value !== undefined &&
    (ADMIN_TABS as readonly string[]).includes(value)
  );
}

export function parseAdminTab(tab: string | undefined): AdminTabId {
  return isAdminTabId(tab) ? tab : DEFAULT_ADMIN_TAB;
}

export function parseAdminPage(page: string | undefined): number {
  const raw = parseInt(page ?? "1", 10);
  return Number.isFinite(raw) && raw >= 1 ? raw : 1;
}

/** Single admin URL; overview omits `tab`, pagination uses `page`. */
export function adminTabUrl(tab: AdminTabId, page?: number): string {
  const params = new URLSearchParams();
  if (tab !== "overview") params.set("tab", tab);
  if (page !== undefined && page > 1) params.set("page", String(page));
  const q = params.toString();
  return q ? `/admin?${q}` : "/admin";
}
