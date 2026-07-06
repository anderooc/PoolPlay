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
