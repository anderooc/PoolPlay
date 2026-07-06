import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateBracketTierSettings } from "./bracket-tiers";

describe("validateBracketTierSettings", () => {
  it("accepts a valid gold and silver split", () => {
    const result = validateBracketTierSettings(10, 2, 6, null);
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.tiers, [6, 4]);
  });

  it("rejects gold leaving fewer than 2 teams for silver", () => {
    const result = validateBracketTierSettings(10, 2, 9, null);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /at most 8 teams/);
    }
  });

  it("accepts a valid three-tier split", () => {
    const result = validateBracketTierSettings(12, 3, 4, 4);
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.tiers, [4, 4, 4]);
  });

  it("rejects gold and silver that leave no bronze teams", () => {
    const result = validateBracketTierSettings(10, 3, 6, 4);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /No teams left for bronze/);
    }
  });

  it("rejects three brackets when there are too few teams", () => {
    const result = validateBracketTierSettings(5, 3, 2, 2);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /at least 6 teams/);
    }
  });
});
