import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { pageTitle } from "@/lib/metadata";
import {
  DEFAULT_TOURNAMENT_TAB,
  isTournamentTabId,
  TOURNAMENT_TAB_LABELS,
  type TournamentTabId,
} from "@/app/(dashboard)/tournaments/[slug]/constants";

export async function getTournamentNameBySlug(
  slug: string
): Promise<string | null> {
  const [row] = await db
    .select({ name: tournaments.name })
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .limit(1);

  return row?.name ?? null;
}

export function tournamentDetailTitle(
  tournamentName: string,
  tab?: string | null
): string {
  const normalizedTab = tab ?? undefined;
  let tabId: TournamentTabId = DEFAULT_TOURNAMENT_TAB;
  if (isTournamentTabId(normalizedTab)) {
    tabId = normalizedTab;
  }

  if (tabId === DEFAULT_TOURNAMENT_TAB) {
    return tournamentName;
  }

  return pageTitle(TOURNAMENT_TAB_LABELS[tabId], tournamentName);
}
