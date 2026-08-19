/*
 * brackt - Collegiate club volleyball tournament hub
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findJerseyCollision,
  jerseyCollisionError,
  parseJerseyNumber,
} from "@/lib/profile/jersey-number";

describe("parseJerseyNumber", () => {
  it("treats blank values as no number", () => {
    assert.equal(parseJerseyNumber(""), null);
    assert.equal(parseJerseyNumber("  "), null);
    assert.equal(parseJerseyNumber(null), null);
    assert.equal(parseJerseyNumber(undefined), null);
  });

  it("accepts 0–99", () => {
    assert.equal(parseJerseyNumber("0"), 0);
    assert.equal(parseJerseyNumber("7"), 7);
    assert.equal(parseJerseyNumber("99"), 99);
    assert.equal(parseJerseyNumber("07"), 7);
  });

  it("rejects values outside 0–99 or non-digits", () => {
    assert.equal(parseJerseyNumber("100"), "invalid");
    assert.equal(parseJerseyNumber("-1"), "invalid");
    assert.equal(parseJerseyNumber("1.5"), "invalid");
    assert.equal(parseJerseyNumber("nope"), "invalid");
    assert.equal(parseJerseyNumber(" 8 "), 8);
  });
});

describe("findJerseyCollision", () => {
  const school = [
    { userId: "a", jerseyNumber: 7 },
    { userId: "b", jerseyNumber: 12 },
  ];
  const team = [
    { userId: "a", jerseyNumber: 7 },
    { userId: "c", jerseyNumber: 3 },
  ];

  it("allows clearing a number", () => {
    assert.equal(
      findJerseyCollision({
        userId: "a",
        jerseyNumber: null,
        schoolOccupants: school,
        teamOccupants: team,
      }),
      null
    );
  });

  it("lets a player keep their own number", () => {
    assert.equal(
      findJerseyCollision({
        userId: "a",
        jerseyNumber: 7,
        schoolOccupants: school,
        teamOccupants: team,
      }),
      null
    );
  });

  it("blocks a school duplicate first", () => {
    assert.equal(
      findJerseyCollision({
        userId: "c",
        jerseyNumber: 7,
        schoolOccupants: school,
        teamOccupants: team,
      }),
      "school"
    );
  });

  it("blocks a team duplicate when the school is clear", () => {
    assert.equal(
      findJerseyCollision({
        userId: "b",
        jerseyNumber: 3,
        schoolOccupants: school,
        teamOccupants: team,
      }),
      "team"
    );
  });
});

describe("jerseyCollisionError", () => {
  it("names the roster that already has the number", () => {
    assert.equal(
      jerseyCollisionError("school", 7),
      "Jersey #7 is already taken at this school."
    );
    assert.equal(
      jerseyCollisionError("team", 12),
      "Jersey #12 is already taken on a team roster."
    );
  });
});
