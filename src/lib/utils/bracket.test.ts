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
  bracketSizeForTeamCount,
  byeCountForTeamCount,
  byeWinnerId,
  bracketAdvanceTarget,
  generateSingleEliminationBracket,
  isByeMatch,
  roundOneAdvanceTarget,
} from "./bracket";

describe("bracketSizeForTeamCount", () => {
  it("pads to the next power of two", () => {
    assert.equal(bracketSizeForTeamCount(6), 8);
    assert.equal(bracketSizeForTeamCount(8), 8);
    assert.equal(bracketSizeForTeamCount(9), 16);
    assert.equal(bracketSizeForTeamCount(2), 2);
  });
});

describe("generateSingleEliminationBracket", () => {
  it("6 teams: top two seeds receive byes in round 1", () => {
    const teams = ["s1", "s2", "s3", "s4", "s5", "s6"];
    const roundOne = generateSingleEliminationBracket(teams).filter(
      (m) => m.round === 1
    );

    assert.equal(roundOne.length, 4);
    assert.equal(byeCountForTeamCount(6), 2);

    const byeMatches = roundOne.filter(isByeMatch);
    assert.equal(byeMatches.length, 2);
    assert.deepEqual(
      byeMatches.map((m) => byeWinnerId(m)).sort(),
      ["s1", "s2"]
    );
  });

  it("5 teams: top three seeds receive byes", () => {
    const teams = ["s1", "s2", "s3", "s4", "s5"];
    const roundOne = generateSingleEliminationBracket(teams).filter(
      (m) => m.round === 1
    );

    assert.equal(byeCountForTeamCount(5), 3);
    const byeWinners = roundOne.filter(isByeMatch).map((m) => byeWinnerId(m));
    assert.deepEqual(byeWinners.sort(), ["s1", "s2", "s3"]);
  });

  it("3 teams: only seed 1 receives a bye", () => {
    const teams = ["s1", "s2", "s3"];
    const roundOne = generateSingleEliminationBracket(teams).filter(
      (m) => m.round === 1
    );

    assert.equal(roundOne.length, 2);
    assert.equal(byeCountForTeamCount(3), 1);
    assert.equal(byeWinnerId(roundOne.find(isByeMatch)!), "s1");
  });
});

describe("roundOneAdvanceTarget", () => {
  it("maps round-1 positions into round-2 slots", () => {
    assert.deepEqual(roundOneAdvanceTarget(1), {
      round: 2,
      position: 1,
      slot: "A",
    });
    assert.deepEqual(roundOneAdvanceTarget(2), {
      round: 2,
      position: 1,
      slot: "B",
    });
    assert.deepEqual(roundOneAdvanceTarget(3), {
      round: 2,
      position: 2,
      slot: "A",
    });
  });
});

describe("bracketAdvanceTarget", () => {
  it("maps semis into the final", () => {
    assert.deepEqual(bracketAdvanceTarget(2, 1), {
      round: 3,
      position: 1,
      slot: "A",
    });
    assert.deepEqual(bracketAdvanceTarget(2, 2), {
      round: 3,
      position: 1,
      slot: "B",
    });
  });
});
