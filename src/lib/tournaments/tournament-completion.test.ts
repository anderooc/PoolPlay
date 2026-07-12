/*
 * PoolPlay - Collegiate club volleyball tournament hub
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

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  allActiveBracketsHaveChampions,
  bracketHasChampion,
  bracketIsActive,
} from "./tournament-completion";

const final = (
  overrides: Partial<{
    status: string;
    winnerId: string | null;
    teamAId: string | null;
    teamBId: string | null;
  }> = {}
) => ({
  bracketRound: 2,
  status: "completed",
  winnerId: "t1",
  teamAId: "t1",
  teamBId: "t2",
  ...overrides,
});

const semi = (position: number) => ({
  bracketRound: 1,
  status: "completed" as const,
  winnerId: "t1",
  teamAId: "t1",
  teamBId: "t3",
  bracketPosition: position,
});

describe("bracketIsActive", () => {
  it("is false for an empty shell", () => {
    assert.equal(
      bracketIsActive([
        { bracketRound: 1, status: "upcoming", winnerId: null, teamAId: null, teamBId: null },
      ]),
      false
    );
  });

  it("is true when any match has a team", () => {
    assert.equal(
      bracketIsActive([
        { bracketRound: 1, status: "upcoming", winnerId: null, teamAId: "t1", teamBId: null },
      ]),
      true
    );
  });
});

describe("bracketHasChampion", () => {
  it("requires a completed final with a winner", () => {
    assert.equal(bracketHasChampion([semi(1), final()]), true);
    assert.equal(
      bracketHasChampion([semi(1), final({ status: "in_progress", winnerId: null })]),
      false
    );
    assert.equal(
      bracketHasChampion([semi(1), final({ winnerId: null })]),
      false
    );
  });

  it("uses the highest bracket round as the final", () => {
    assert.equal(
      bracketHasChampion([
        semi(1),
        { ...final(), bracketRound: 3 },
      ]),
      true
    );
  });
});

describe("allActiveBracketsHaveChampions", () => {
  it("ignores inactive bracket shells", () => {
    assert.equal(
      allActiveBracketsHaveChampions([
        {
          matches: [
            { bracketRound: 1, status: "upcoming", winnerId: null, teamAId: null, teamBId: null },
          ],
        },
        { matches: [semi(1), final()] },
      ]),
      true
    );
  });

  it("requires every active bracket to have a champion", () => {
    assert.equal(
      allActiveBracketsHaveChampions([
        { matches: [semi(1), final()] },
        { matches: [semi(1), final({ status: "upcoming", winnerId: null })] },
      ]),
      false
    );
  });

  it("is false when no brackets are active", () => {
    assert.equal(
      allActiveBracketsHaveChampions([
        {
          matches: [
            { bracketRound: 1, status: "upcoming", winnerId: null, teamAId: null, teamBId: null },
          ],
        },
      ]),
      false
    );
  });
});
