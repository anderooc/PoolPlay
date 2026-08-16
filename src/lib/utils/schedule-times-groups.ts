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

import { isBracketRoundOneByeMatch } from "@/lib/utils/bracket";
import { bracketScheduleLabel } from "@/lib/tournaments/bracket-tiers";
import {
  assignIndexWaves,
  type MatchTimeFillStatus,
  type ScheduleTimesScope,
} from "@/lib/utils/match-time-fill";

export type ScheduleTimesMatchDTO = {
  id: string;
  groupId: string;
  groupName: string;
  wave: number;
  status: MatchTimeFillStatus;
  scheduledTime: string | null;
  courtId: string | null;
  teamAName: string | null;
  teamBName: string | null;
  isBye: boolean;
};

export type ScheduleTimesGroupDTO = {
  id: string;
  label: string;
  scope: ScheduleTimesScope;
  matches: ScheduleTimesMatchDTO[];
};

type PlayPool = {
  id: string;
  name: string;
  matches: {
    id: string;
    status: string;
    scheduledTime: Date | string | null;
    courtId?: string | null;
    teamA: { name: string } | null;
    teamB: { name: string } | null;
  }[];
};

type PlayBracket = {
  id: string;
  name: string | null;
  tier: number;
  matches: {
    id: string;
    status: string;
    scheduledTime: Date | string | null;
    courtId?: string | null;
    bracketRound: number | null;
    teamAId: string | null;
    teamBId: string | null;
    teamAName: string | null;
    teamBName: string | null;
    teamA: { name: string } | null;
    teamB: { name: string } | null;
  }[];
};

type PlayDivision = {
  id: string;
  name: string;
  pools: PlayPool[];
  brackets: PlayBracket[];
};

function asStatus(status: string): MatchTimeFillStatus {
  if (status === "in_progress" || status === "completed") return status;
  return "upcoming";
}

function timeIso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function poolScheduleGroup(
  division: PlayDivision
): ScheduleTimesGroupDTO | null {
  const idsByPool = new Map<string, string[]>();
  for (const pool of division.pools) {
    idsByPool.set(
      pool.id,
      pool.matches.map((match) => match.id)
    );
  }
  const waves = assignIndexWaves(idsByPool);
  const matches: ScheduleTimesMatchDTO[] = division.pools.flatMap((pool) =>
    pool.matches.map((match) => ({
      id: match.id,
      groupId: pool.id,
      groupName: pool.name,
      wave: waves.get(match.id) ?? 0,
      status: asStatus(match.status),
      scheduledTime: timeIso(match.scheduledTime),
      courtId: match.courtId ?? null,
      teamAName: match.teamA?.name ?? null,
      teamBName: match.teamB?.name ?? null,
      isBye: false,
    }))
  );
  if (matches.length === 0) return null;
  return {
    id: `pools:${division.id}`,
    label: `${division.name} pools`,
    scope: { type: "division-pools", divisionId: division.id },
    matches,
  };
}

export function bracketScheduleGroup(
  bracket: PlayBracket
): ScheduleTimesGroupDTO | null {
  const label = bracketScheduleLabel(bracket);
  const matches: ScheduleTimesMatchDTO[] = bracket.matches.map((match) => ({
    id: match.id,
    groupId: bracket.id,
    groupName: label,
    wave: match.bracketRound ?? 1,
    status: asStatus(match.status),
    scheduledTime: timeIso(match.scheduledTime),
    courtId: match.courtId ?? null,
    teamAName: match.teamAName ?? match.teamA?.name ?? null,
    teamBName: match.teamBName ?? match.teamB?.name ?? null,
    isBye: isBracketRoundOneByeMatch({
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      bracketRound: match.bracketRound,
    }),
  }));
  if (matches.length === 0) return null;
  return {
    id: `bracket:${bracket.id}`,
    label,
    scope: { type: "bracket", bracketId: bracket.id },
    matches,
  };
}

export function scheduleGroupsFromPlayData(
  divisions: PlayDivision[],
  kind: "pools" | "brackets" | "all"
): ScheduleTimesGroupDTO[] {
  const poolGroups: ScheduleTimesGroupDTO[] = [];
  const bracketEntries: { tier: number; group: ScheduleTimesGroupDTO }[] = [];
  const seenBrackets = new Set<string>();

  for (const division of divisions) {
    if (kind === "pools" || kind === "all") {
      const group = poolScheduleGroup(division);
      if (group) poolGroups.push(group);
    }
  }

  for (const division of divisions) {
    if (kind === "brackets" || kind === "all") {
      for (const bracket of division.brackets) {
        if (seenBrackets.has(bracket.id)) continue;
        seenBrackets.add(bracket.id);
        const group = bracketScheduleGroup(bracket);
        if (group) {
          bracketEntries.push({ tier: bracket.tier, group });
        }
      }
    }
  }

  bracketEntries.sort((a, b) => a.tier - b.tier);
  return [...poolGroups, ...bracketEntries.map((entry) => entry.group)];
}
