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

import { getDivisionPlayData } from "@/app/(dashboard)/tournaments/[slug]/brackets/data";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  divisions,
  matches,
  pools,
  poolTeams,
  registrations,
} from "@/lib/db/schema";
import {
  ensureDivisionBracketSkeleton,
  tryFillBracketFromDivisionSeeds,
} from "@/lib/tournaments/bracket-structure";
import { regeneratePoolMatchesFromSeeds } from "@/lib/tournaments/pool-matches";
import {
  canAssignTeamsToPools,
  poolAssignmentBlockedMessage,
} from "@/lib/tournaments/permissions";
import { and, count, eq } from "drizzle-orm";
import type {
  TournamentHostPoolsContract,
  TournamentHostPoolsResultContract,
  TournamentHostPoolSeedingResultContract,
  TournamentHostReleaseResultContract,
} from "../contracts/tournament-host";
import { badRequest, notFound } from "../errors";
import { requireHostTournament } from "./tournament-host";

async function buildPoolsContract(
  tournament: Awaited<ReturnType<typeof requireHostTournament>>,
  user: AppUser
): Promise<TournamentHostPoolsContract> {
  const [{ value: pendingCount }, divisionPlayData, tournamentDivisions] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(registrations)
        .where(
          and(
            eq(registrations.tournamentId, tournament.id),
            eq(registrations.status, "pending")
          )
        )
        .then((rows) => rows[0] ?? { value: 0 }),
      getDivisionPlayData(tournament.id, { forOrganizer: true }),
      db
        .select({ id: divisions.id, format: divisions.format })
        .from(divisions)
        .where(eq(divisions.tournamentId, tournament.id)),
    ]);

  const pending = pendingCount ?? 0;
  const canAssignPools = await canAssignTeamsToPools(
    tournament,
    user,
    pending
  );
  const poolAssignmentBlocked = poolAssignmentBlockedMessage(pending);

  if (tournamentDivisions.length > 0) {
    const divsWithBracket = new Set(
      divisionPlayData.filter((div) => div.brackets.length > 0).map((div) => div.id)
    );
    for (const div of tournamentDivisions) {
      if (divsWithBracket.has(div.id)) continue;
      await ensureDivisionBracketSkeleton(div.id, div.format);
    }
  }

  return {
    canAssignPools,
    poolAssignmentBlocked,
    divisions: divisionPlayData.map((division) => {
      const matchCount = division.pools.reduce(
        (total, pool) => total + pool.matches.length,
        0
      );
      const completedMatchCount = division.pools.reduce(
        (total, pool) =>
          total +
          pool.matches.filter((match) => match.status === "completed").length,
        0
      );
      return {
        id: division.id,
        name: division.name,
        format: division.format,
        poolsReleasedAt: division.poolsReleasedAt?.toISOString() ?? null,
        matchCount,
        completedMatchCount,
        pools: division.pools.map((pool) => ({
          id: pool.id,
          name: pool.name,
          teams: pool.teams.map((team) => ({
            id: team.id,
            name: team.name,
            university: team.university,
            seed: team.seed,
          })),
          matchCount: pool.matches.length,
          completedMatchCount: pool.matches.filter(
            (match) => match.status === "completed"
          ).length,
          matchesStarted: pool.matches.some(
            (match) => match.status !== "upcoming"
          ),
        })),
      };
    }),
  };
}

async function poolsResult(
  slug: string,
  user: AppUser
): Promise<TournamentHostPoolsResultContract> {
  const tournament = await requireHostTournament(slug, user);
  return {
    success: true,
    pools: await buildPoolsContract(tournament, user),
  };
}

export async function loadTournamentHostPools(
  slug: string,
  user: AppUser
): Promise<TournamentHostPoolsResultContract> {
  return poolsResult(slug, user);
}

export async function updateTournamentHostPoolSeeding(
  slug: string,
  user: AppUser,
  poolId: string,
  orderedTeamIds: string[]
): Promise<TournamentHostPoolSeedingResultContract> {
  const tournament = await requireHostTournament(slug, user);

  const [pool] = await db
    .select({ divisionId: pools.divisionId })
    .from(pools)
    .where(eq(pools.id, poolId))
    .limit(1);
  if (!pool) throw notFound("Pool not found.");

  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, pool.divisionId))
    .limit(1);
  if (!division || division.tournamentId !== tournament.id) {
    throw badRequest("Tournament mismatch.");
  }

  const [{ value: pendingCount }] = await db
    .select({ value: count() })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournament.id),
        eq(registrations.status, "pending")
      )
    );
  const pending = pendingCount ?? 0;
  const blocked = poolAssignmentBlockedMessage(pending);
  if (blocked) throw badRequest(blocked);
  if (!(await canAssignTeamsToPools(tournament, user, pending))) {
    throw badRequest(
      "Pool seeding can only be updated after registration closes."
    );
  }

  const uniqueIds = [...new Set(orderedTeamIds)];
  if (uniqueIds.length < 2) {
    throw badRequest("Need at least 2 teams to set seeding.");
  }

  const members = await db
    .select({ teamId: poolTeams.teamId })
    .from(poolTeams)
    .where(eq(poolTeams.poolId, poolId));
  const memberIds = new Set(members.map((member) => member.teamId));
  if (
    uniqueIds.length !== members.length ||
    uniqueIds.some((id) => !memberIds.has(id))
  ) {
    throw badRequest("Seeding must include every team in this pool.");
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < uniqueIds.length; i++) {
      await tx
        .update(poolTeams)
        .set({ seed: i + 1 })
        .where(
          and(
            eq(poolTeams.poolId, poolId),
            eq(poolTeams.teamId, uniqueIds[i])
          )
        );
    }
  });

  const matchResult = await regeneratePoolMatchesFromSeeds(poolId);
  if (matchResult.error) {
    throw badRequest(matchResult.error);
  }

  if (division.format === "single_elimination") {
    await tryFillBracketFromDivisionSeeds(division.id);
  }

  return {
    success: true,
    matchCount: matchResult.matchCount ?? 0,
    pools: await buildPoolsContract(tournament, user),
  };
}

export async function releaseTournamentHostDivisionPools(
  slug: string,
  user: AppUser,
  divisionId: string
): Promise<TournamentHostReleaseResultContract> {
  const tournament = await requireHostTournament(slug, user);

  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1);
  if (!division || division.tournamentId !== tournament.id) {
    throw notFound("Pool not found.");
  }

  if (division.poolsReleasedAt) {
    return {
      success: true,
      alreadyReleased: true,
      pools: await buildPoolsContract(tournament, user),
    };
  }

  const poolRows = await db
    .select({ id: pools.id })
    .from(pools)
    .where(eq(pools.divisionId, divisionId))
    .limit(1);
  const poolId = poolRows[0]?.id;
  if (!poolId) {
    throw badRequest("Set up pool matches before releasing.");
  }

  const [{ value: matchCount }] = await db
    .select({ value: count() })
    .from(matches)
    .where(eq(matches.poolId, poolId));
  if ((matchCount ?? 0) === 0) {
    throw badRequest(
      "Save seeding and generate pool matches before releasing."
    );
  }

  await db
    .update(divisions)
    .set({ poolsReleasedAt: new Date() })
    .where(eq(divisions.id, divisionId));

  return {
    success: true,
    alreadyReleased: false,
    pools: await buildPoolsContract(tournament, user),
  };
}
