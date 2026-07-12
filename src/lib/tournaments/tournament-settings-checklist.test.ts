/*
 * PoolPlay - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
