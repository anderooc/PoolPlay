export const TOURNAMENT_TABS = [
  "setup",
  "packet",
  "waiver",
  "teams",
  "pending",
  "pool-play",
  "bracket",
  "matches",
] as const;

export type TournamentTabId = (typeof TOURNAMENT_TABS)[number];

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
  if (isTournamentTabId(tab) && allowed.has(tab)) return tab;
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
