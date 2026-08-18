import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPoolScheduleContext,
  formatSeedMatchup,
  lookupPoolMatchRound,
} from "@/lib/tournaments/packet-pool-schedule";

describe("packet pool schedule", () => {
  it("maps a 4-team pool match to the correct round and seed labels", () => {
    const members = [
      { teamId: "t1", seed: 1 },
      { teamId: "t2", seed: 2 },
      { teamId: "t3", seed: 3 },
      { teamId: "t4", seed: 4 },
    ];
    const context = buildPoolScheduleContext(members);
    const round = lookupPoolMatchRound(context.roundByPair, "t2", "t4");

    assert.equal(round, 1);
    assert.equal(formatSeedMatchup(2, 4), "Seed 2 vs Seed 4");
  });
});
