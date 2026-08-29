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

import type { AppUser } from "@/lib/auth";
import { flagBlockedContent } from "@/lib/admin/content-flags";
import { db } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import { isCreatablePlayFormat } from "@/lib/labels/play-format";
import {
  OperationConflictError,
  OperationValidationError,
} from "@/lib/tournaments/competition-operation-rules";
import { createTournamentWithHostLocks } from "@/lib/tournaments/tournament-creation";
import { invalidatePublicTournamentCachesByIds } from "@/lib/tournaments/public-cache-invalidation";
import { slugify, uniqueSlug } from "@/lib/utils/slug";
import {
  createTournamentSchema,
  type CreateTournamentInput,
} from "@/lib/validators";
import type { CreateEntityResultContract } from "../contracts/create";
import { badRequest } from "../errors";

export async function createTournamentForViewer(
  user: AppUser,
  input: CreateTournamentInput
): Promise<CreateEntityResultContract> {
  if (!isCreatablePlayFormat(input.playFormat)) {
    throw badRequest("Choose a supported tournament format");
  }

  const parsed = createTournamentSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0].message);
  }

  const contentError = await flagBlockedContent(user.id, [
    { area: "tournament.name", text: parsed.data.name },
    { area: "tournament.description", text: parsed.data.description },
    { area: "tournament.location", text: parsed.data.location },
    { area: "tournament.address", text: parsed.data.address },
  ]);
  if (contentError) throw badRequest(contentError);

  const base = slugify(parsed.data.name, "tournament");
  const existingSlugs = await db
    .select({ slug: tournaments.slug })
    .from(tournaments);
  const slug = uniqueSlug(
    base,
    existingSlugs.map((t) => t.slug)
  );

  let tournament: Awaited<ReturnType<typeof createTournamentWithHostLocks>>;
  try {
    tournament = await createTournamentWithHostLocks({
      actorId: user.id,
      hostSchoolId: parsed.data.hostSchoolId,
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      date: parsed.data.date,
      location: parsed.data.location,
      address: parsed.data.address || null,
      playFormat: parsed.data.playFormat,
    });
  } catch (error) {
    if (error instanceof OperationValidationError) {
      throw badRequest(error.message);
    }
    if (error instanceof OperationConflictError) {
      throw badRequest(error.message);
    }
    throw error;
  }

  await invalidatePublicTournamentCachesByIds([tournament.id], {
    listing: true,
  });

  return { success: true, slug: tournament.slug, name: tournament.name };
}
