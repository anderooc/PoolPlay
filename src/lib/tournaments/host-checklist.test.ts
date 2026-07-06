import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hostChecklistSteps } from "./permissions";
import {
  bracketSettingsChecklistComplete,
  poolSettingsChecklistComplete,
} from "./tournament-settings-checklist";

const base = {
  status: "registration_closed",
  description:
    "A long enough description with $50 first team and $40 additional teams. Starts at 9am.",
  address: "123 Main St",
  divisionCount: 2,
  courtCount: 4,
  registrationCount: 8,
  pendingCount: 0,
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
  poolSettingsSavedAt: new Date("2026-01-01"),
  bracketCount: 2,
  goldTeamCount: 4,
  silverTeamCount: null,
  bracketSettingsSavedAt: new Date("2026-01-01"),
  hasPools: true,
  hasPoolsReleased: true,
  hasSeededBrackets: true,
  hasScheduledMatches: true,
};

describe("hostChecklistSteps", () => {
  it("includes pool and bracket settings steps for pool_to_bracket", () => {
    const steps = hostChecklistSteps({
      ...base,
      playFormat: "pool_to_bracket",
    });
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("pool-settings"));
    assert.ok(ids.includes("bracket-settings"));
    assert.ok(ids.includes("release"));
    assert.equal(
      steps.find((s) => s.id === "bracket")?.label,
      "Seed brackets from pool play"
    );
  });

  it("includes pool settings but not bracket tiers for single elimination", () => {
    const steps = hostChecklistSteps({
      ...base,
      playFormat: "single_elimination",
      hasPoolsReleased: false,
      bracketCount: 1,
      goldTeamCount: null,
      bracketSettingsSavedAt: null,
    });
    const ids = steps.map((s) => s.id);
    assert.ok(ids.includes("pool-settings"));
    assert.equal(ids.includes("bracket-settings"), false);
    assert.equal(ids.includes("release"), false);
  });

  it("marks confirm step incomplete while registration is open", () => {
    const steps = hostChecklistSteps({
      ...base,
      status: "registration_open",
      playFormat: "pool_to_bracket",
    });
    assert.equal(steps.find((s) => s.id === "confirm")?.done, false);
  });
});

describe("tournament settings checklist", () => {
  it("requires explicit save when pool settings use defaults", () => {
    assert.equal(
      poolSettingsChecklistComplete({
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
      }),
      false
    );
  });

  it("marks bracket tiers incomplete when gold count missing", () => {
    assert.equal(
      bracketSettingsChecklistComplete({
        playFormat: "pool_to_bracket",
        bracketCount: 2,
        goldTeamCount: null,
        silverTeamCount: null,
        bracketSettingsSavedAt: null,
      }),
      false
    );
  });
});
