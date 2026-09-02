/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { notFound } from "next/navigation";
import { findPublicTournamentBySlug } from "@/lib/api/queries/tournament-detail";
import { loadPublicTournamentExtras } from "@/lib/api/queries/tournament-detail";
import { getCachedPublicTournamentList } from "@/lib/tournaments/public-list-cache";
import type { TournamentListItemContract } from "@/lib/api/contracts/tournament";

export type PublicTournamentShell = {
  slug: string;
  listItem: TournamentListItemContract;
  address: string | null;
  organizerName: string;
  registrationOpen: boolean;
  hasReleasedPlay: boolean;
};

export async function loadPublicTournamentShell(
  slug: string
): Promise<PublicTournamentShell> {
  const listItem = findPublicTournamentBySlug(
    await getCachedPublicTournamentList(),
    slug
  );
  if (!listItem) notFound();

  const extras = await loadPublicTournamentExtras(slug);
  if (!extras) notFound();

  const hasReleasedPlay = extras.divisions.some(
    (division) => division.poolsReleased
  );

  return {
    slug,
    listItem,
    address: extras.address,
    organizerName: extras.organizerName,
    registrationOpen: extras.registrationOpen,
    hasReleasedPlay,
  };
}
