import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bracketSettingsChecklistComplete,
  poolSettingsChecklistComplete,
} from "./tournament-settings-checklist";

describe("poolSettingsChecklistComplete", () => {
  const defaults = {
    matchFormat: "two_with_tiebreak",
    setStartingScore: 0,
    setTargetScore: 25,
    tiebreakTargetScore: 15,
    warmupFormat: "three_three_one",
    poolTiebreakCriteria: [
      "match_record",
      "set_record",
      "point_diff",
      "head_to_head",
    ],
    poolSettingsSavedAt: null,
    hasPoolMatches: false,
  };

  it("is complete after explicit save", () => {
    assert.equal(
      poolSettingsChecklistComplete({
        ...defaults,
        poolSettingsSavedAt: new Date(),
      }),
      true
    );
  });

  it("is complete once pool matches exist", () => {
    assert.equal(
      poolSettingsChecklistComplete({
        ...defaults,
        hasPoolMatches: true,
      }),
      true
    );
  });

  it("is complete when any value differs from defaults", () => {
    assert.equal(
      poolSettingsChecklistComplete({
        ...defaults,
        setTargetScore: 21,
      }),
      true
    );
  });
});

describe("bracketSettingsChecklistComplete", () => {
  it("is complete for single-bracket tournaments", () => {
    assert.equal(
      bracketSettingsChecklistComplete({
        playFormat: "pool_to_bracket",
        bracketCount: 1,
        goldTeamCount: null,
        silverTeamCount: null,
        bracketSettingsSavedAt: null,
      }),
      true
    );
  });

  it("requires gold count for two-bracket splits", () => {
    assert.equal(
      bracketSettingsChecklistComplete({
        playFormat: "pool_to_bracket",
        bracketCount: 2,
        goldTeamCount: 4,
        silverTeamCount: null,
        bracketSettingsSavedAt: null,
      }),
      true
    );
  });
});
