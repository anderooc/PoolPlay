import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generatePoolMatches } from "./pool";

/** teamIds ordered seed 1 → lowest (as in regeneratePoolMatchesFromSeeds). */
function pairLabels(teamIds: string[]) {
  return generatePoolMatches(teamIds).map((m) => {
    const a = teamIds.indexOf(m.teamAId) + 1;
    const b = teamIds.indexOf(m.teamBId) + 1;
    return a < b ? `${a}v${b}` : `${b}v${a}`;
  });
}

describe("generatePoolMatches", () => {
  it("3-team pool: first match is lowest vs seed 2", () => {
    const teams = ["s1", "s2", "s3"];
    const pairs = pairLabels(teams);
    assert.equal(pairs.length, 3);
    assert.equal(pairs[0], "2v3");
    assert.deepEqual(new Set(pairs), new Set(["1v3", "1v2", "2v3"]));
  });

  it("4-team pool: first match is lowest vs seed 2", () => {
    const teams = ["s1", "s2", "s3", "s4"];
    const pairs = pairLabels(teams);
    assert.equal(pairs.length, 6);
    assert.equal(pairs[0], "2v4");
    assert.equal(pairs[1], "1v3");
  });
});
