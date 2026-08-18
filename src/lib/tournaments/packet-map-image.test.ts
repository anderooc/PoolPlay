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

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildLocationMapQuery,
  geocodeQueryVariants,
} from "@/lib/tournaments/packet-map-image";

describe("buildLocationMapQuery", () => {
  it("joins location and address like the web map preview", () => {
    assert.equal(
      buildLocationMapQuery("123 Main St", "Rec Center"),
      "Rec Center, 123 Main St"
    );
  });

  it("returns null when address is empty", () => {
    assert.equal(buildLocationMapQuery("  ", "Rec Center"), null);
    assert.equal(buildLocationMapQuery("", "Rec Center"), null);
  });

  it("uses address alone when location is missing", () => {
    assert.equal(buildLocationMapQuery("123 Main St"), "123 Main St");
  });
});

describe("geocodeQueryVariants", () => {
  it("returns deduped candidates most specific first", () => {
    assert.deepEqual(
      geocodeQueryVariants("123 Main St, Berkeley, CA", "Rec Center"),
      [
        "Rec Center, 123 Main St, Berkeley, CA",
        "123 Main St, Berkeley, CA",
        "123 Main St, Berkeley, CA, Rec Center",
        "Rec Center",
      ]
    );
  });

  it("drops address-only queries shorter than four characters", () => {
    assert.deepEqual(geocodeQueryVariants("123", "Rec Center"), [
      "Rec Center, 123",
      "123, Rec Center",
      "Rec Center",
    ]);
    assert.deepEqual(geocodeQueryVariants("12", "Rec"), ["Rec, 12", "12, Rec"]);
    assert.deepEqual(geocodeQueryVariants("", ""), []);
  });
});
