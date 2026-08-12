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

export const TOURNAMENT_TABS = [
  "setup",
  "packet",
  "waiver",
  "payment",
  "email",
  "chat",
  "teams",
  "pending",
  "pool-play",
  "bracket",
  "matches",
] as const;

export type TournamentTabId = (typeof TOURNAMENT_TABS)[number];

export const TOURNAMENT_TAB_LABELS: Record<TournamentTabId, string> = {
  setup: "Setup",
  packet: "Packet",
  waiver: "Waiver",
  payment: "Payment",
  email: "Email",
  chat: "Chat",
  teams: "Teams",
  pending: "Pending",
  "pool-play": "Pools",
  bracket: "Bracket",
  matches: "Matches",
};

export type TournamentTabGroupId = "preparation" | "matchday";

export const TOURNAMENT_TAB_GROUP_ORDER = [
  "preparation",
  "matchday",
] as const satisfies readonly TournamentTabGroupId[];

export const TOURNAMENT_TAB_GROUP_LABELS: Record<
  TournamentTabGroupId,
  string
> = {
  preparation: "Preparation",
  matchday: "Match day",
};

const TAB_GROUP_BY_ID: Record<TournamentTabId, TournamentTabGroupId> = {
  setup: "preparation",
  packet: "preparation",
  waiver: "preparation",
  payment: "preparation",
  email: "preparation",
  chat: "preparation",
  teams: "preparation",
  pending: "preparation",
  "pool-play": "matchday",
  bracket: "matchday",
  matches: "matchday",
};

export type TournamentTabItem = {
  id: TournamentTabId;
  label: string;
  count?: number;
  badge?: number;
};

export type TournamentTabGroup = {
  id: TournamentTabGroupId;
  label: string;
  tabs: TournamentTabItem[];
};

export function buildTournamentTabGroups(
  tabs: TournamentTabItem[]
): TournamentTabGroup[] {
  const byGroup = new Map<TournamentTabGroupId, TournamentTabItem[]>();
  for (const tab of tabs) {
    const groupId = TAB_GROUP_BY_ID[tab.id];
    const list = byGroup.get(groupId) ?? [];
    list.push(tab);
    byGroup.set(groupId, list);
  }

  return TOURNAMENT_TAB_GROUP_ORDER.flatMap((groupId) => {
    const groupTabs = byGroup.get(groupId);
    if (!groupTabs?.length) return [];
    return [
      {
        id: groupId,
        label: TOURNAMENT_TAB_GROUP_LABELS[groupId],
        tabs: groupTabs,
      },
    ];
  });
}

export const DEFAULT_TOURNAMENT_TAB: TournamentTabId = "setup";

export function isTournamentTabId(
  value: string | undefined
): value is TournamentTabId {
  return (
    value !== undefined &&
    (TOURNAMENT_TABS as readonly string[]).includes(value)
  );
}

export function parseTournamentTab(
  tab: string | undefined,
  allowed: ReadonlySet<TournamentTabId>,
  fallback: TournamentTabId = DEFAULT_TOURNAMENT_TAB
): TournamentTabId {
  const normalized = tab === "messages" ? "email" : tab;
  if (isTournamentTabId(normalized) && allowed.has(normalized)) return normalized;
  if (allowed.has(fallback)) return fallback;
  return DEFAULT_TOURNAMENT_TAB;
}

/** Tournament detail URL; setup omits `tab`. Optional division/pool deep links. */
export function tournamentTabUrl(
  slug: string,
  tab: TournamentTabId = DEFAULT_TOURNAMENT_TAB,
  opts?: { division?: string; pool?: string }
): string {
  const params = new URLSearchParams();
  if (tab !== DEFAULT_TOURNAMENT_TAB) params.set("tab", tab);
  if (opts?.division) params.set("division", opts.division);
  if (opts?.pool) params.set("pool", opts.pool);
  const q = params.toString();
  return q ? `/tournaments/${slug}?${q}` : `/tournaments/${slug}`;
}
