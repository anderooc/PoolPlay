import assert from "node:assert/strict";
import { test } from "node:test";
import { selectOldestEligibleWaitlistEntry } from "./waitlist-selection";

test("selects the oldest eligible entry", () => {
  assert.equal(
    selectOldestEligibleWaitlistEntry([
      { id: "first", queuePosition: 10, eligible: false },
      { id: "second", queuePosition: 11, eligible: true },
      { id: "third", queuePosition: 12, eligible: true },
    ])?.id,
    "second"
  );
});
