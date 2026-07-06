import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assignBracketTiers,
  rankTeamsForCombinedBrackets,
} from "./combined-bracket-standings";

describe("rankTeamsForCombinedBrackets", () => {
  it("groups by pool place then cross-pool tiebreaks", () => {
    const poolA = [
      { teamId: "a1", place: 1, wins: 2, pointDiff: 10, seed: 1 },
      { teamId: "a2", place: 2, wins: 1, pointDiff: 0, seed: 2 },
    ];
    const poolB = [
      { teamId: "b1", place: 1, wins: 3, pointDiff: 15, seed: 1 },
      { teamId: "b2", place: 2, wins: 0, pointDiff: -5, seed: 2 },
    ];

    assert.deepEqual(rankTeamsForCombinedBrackets([poolA, poolB]), [
      "b1",
      "a1",
      "a2",
      "b2",
    ]);
  });
});

describe("assignBracketTiers", () => {
  it("splits teams into gold and silver", () => {
    const ranked = ["t1", "t2", "t3", "t4", "t5", "t6"];
    const tiers = assignBracketTiers(ranked, 2, 4, null);
    assert.equal(tiers.get("t1")?.tierName, "Gold");
    assert.equal(tiers.get("t4")?.tierName, "Silver");
    assert.equal(tiers.get("t1")?.seed, 1);
    assert.equal(tiers.get("t5")?.seed, 2);
  });
});
