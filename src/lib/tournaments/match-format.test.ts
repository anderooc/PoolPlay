/*
 * ShootSet - Collegiate club volleyball tournament hub
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
