/*
 * ShootSet - Collegiate club volleyball tournament hub
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
  assignBracketMatchRefs,
  eligibleBracketRefIds,
  matchLoserId,
  roundOneByeTeamIds,
} from "./bracket-refs";

const base = {
  winnerId: null,
  status: "upcoming",
  courtId: null,
  scheduledTime: null,
};

describe("roundOneByeTeamIds", () => {
  it("collects teams with byes", () => {
    const ids = roundOneByeTeamIds([
      {
        id: "m1",
        bracketRound: 1,
        bracketPosition: 1,
        teamAId: "s1",
        teamBId: null,
        ...base,
      },
    ]);
    assert.deepEqual([...ids], ["s1"]);
  });
});

describe("assignBracketMatchRefs", () => {
  it("assigns bye teams to ref round-1 playable matches", () => {
    const matches = [
      {
        id: "bye",
        bracketRound: 1,
        bracketPosition: 1,
        teamAId: "seed1",
        teamBId: null,
        winnerId: "seed1",
        status: "completed",
        courtId: null,
        scheduledTime: null,
      },
      {
        id: "play",
        bracketRound: 1,
        bracketPosition: 2,
        teamAId: "t3",
        teamBId: "t4",
        ...base,
      },
    ];
    const refs = assignBracketMatchRefs(matches);
    assert.equal(refs.get("play"), "seed1");
  });

  it("assigns feeder losers in round 2", () => {
    const matches = [
      {
        id: "r1a",
        bracketRound: 1,
        bracketPosition: 1,
        teamAId: "a",
        teamBId: "b",
        winnerId: "a",
        status: "completed",
        courtId: null,
        scheduledTime: null,
      },
      {
        id: "r1b",
        bracketRound: 1,
        bracketPosition: 2,
        teamAId: "c",
        teamBId: "d",
        winnerId: "c",
        status: "completed",
        courtId: null,
        scheduledTime: null,
      },
      {
        id: "r2",
        bracketRound: 2,
        bracketPosition: 1,
        teamAId: "a",
        teamBId: "c",
        ...base,
      },
    ];
    const eligible = eligibleBracketRefIds(matches[2], matches);
    assert.ok(eligible.includes("b") || eligible.includes("d"));
    const refs = assignBracketMatchRefs(matches);
    assert.ok(refs.get("r2") === "b" || refs.get("r2") === "d");
  });
});

describe("matchLoserId", () => {
  it("returns the non-winner", () => {
    assert.equal(
      matchLoserId({
        teamAId: "a",
        teamBId: "b",
        winnerId: "a",
        status: "completed",
      }),
      "b"
    );
  });
});
