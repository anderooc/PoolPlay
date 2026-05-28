import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assignRefsToMatchups, generatePoolMatches } from "./pool";

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

describe("assignRefsToMatchups", () => {
  it("3-team pool: each non-playing team refs its one available match", () => {
    const teams = ["s1", "s2", "s3"];
    const matchups = generatePoolMatches(teams);
    const withRefs = assignRefsToMatchups(teams, matchups);
    for (const m of withRefs) {
      assert.notEqual(m.refTeamId, m.teamAId);
      assert.notEqual(m.refTeamId, m.teamBId);
      assert.ok(m.refTeamId, "every match should have a ref in a 3-team pool");
    }
    const counts = new Map<string, number>();
    for (const m of withRefs) {
      counts.set(m.refTeamId!, (counts.get(m.refTeamId!) ?? 0) + 1);
    }
    for (const id of teams) {
      assert.equal(counts.get(id) ?? 0, 1);
    }
  });

  it("4-team pool: every team refs once before any repeats (when possible)", () => {
    const teams = ["s1", "s2", "s3", "s4"];
    const withRefs = assignRefsToMatchups(teams, generatePoolMatches(teams));
    for (const m of withRefs) {
      assert.notEqual(m.refTeamId, m.teamAId);
      assert.notEqual(m.refTeamId, m.teamBId);
    }

    // Progressive assertion: at no point should someone ref twice while another
    // team has still never reffed (unless eligibility makes it impossible; for
    // a 4-team pool it's always possible).
    const counts = new Map<string, number>(teams.map((id) => [id, 0]));
    for (const m of withRefs) {
      const id = m.refTeamId;
      assert.ok(id);
      counts.set(id!, (counts.get(id!) ?? 0) + 1);

      const values = teams.map((t) => counts.get(t) ?? 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      assert.ok(
        !(max >= 2 && min === 0),
        `repeat happened before all teams reffed once: ${values.join(",")}`
      );
    }

    // End state should still be balanced (diff at most 1).
    const final = teams.map((t) => counts.get(t) ?? 0);
    assert.ok(
      Math.max(...final) - Math.min(...final) <= 1,
      `ref counts should differ by at most 1: ${final.join(",")}`
    );
  });

  it("2-team pool: no eligible refs, refTeamId stays null", () => {
    const teams = ["s1", "s2"];
    const withRefs = assignRefsToMatchups(teams, generatePoolMatches(teams));
    assert.equal(withRefs.length, 1);
    assert.equal(withRefs[0].refTeamId, null);
  });
});
