import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setStartingScoreForMatch } from "./match-format";

describe("setStartingScoreForMatch", () => {
  const tournament = {
    setStartingScore: 4,
    bracketSetStartingScore: 0,
  };

  it("uses pool starting score for pool matches", () => {
    assert.equal(
      setStartingScoreForMatch(tournament, {
        poolId: "pool-1",
        bracketId: null,
      }),
      4
    );
  });

  it("uses bracket starting score for bracket matches", () => {
    assert.equal(
      setStartingScoreForMatch(tournament, {
        poolId: null,
        bracketId: "bracket-1",
      }),
      0
    );
  });
});
