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
import type { PlayDivisionContract } from "@/lib/api/contracts/tournament";
import { flattenBrackets } from "./flatten-brackets";

function division(
  overrides: Partial<PlayDivisionContract>
): PlayDivisionContract {
  return {
    name: "Open",
    format: "pool_to_bracket",
    released: true,
    pools: [],
    brackets: [],
    ...overrides,
  };
}

describe("flattenBrackets", () => {
  it("orders by Gold / Silver / Bronze and ignores empty pool divisions", () => {
    const flattened = flattenBrackets({
      divisions: [
        division({
          name: "Pool A",
          brackets: [
            {
              name: "Gold",
              type: "single_elimination",
              tier: 0,
              matches: [],
            },
          ],
        }),
        division({ name: "Pool B", brackets: [] }),
      ],
    });

    assert.deepEqual(
      flattened.map((item) => item.name),
      ["Gold"]
    );
    assert.equal(flattened[0].contextName, undefined);
  });

  it("keeps a division label only when two brackets share a name", () => {
    const flattened = flattenBrackets({
      divisions: [
        division({
          name: "Men's",
          format: "single_elimination",
          brackets: [
            {
              name: "Gold",
              type: "single_elimination",
              tier: 0,
              matches: [],
            },
          ],
        }),
        division({
          name: "Women's",
          format: "single_elimination",
          brackets: [
            {
              name: "Gold",
              type: "single_elimination",
              tier: 0,
              matches: [],
            },
          ],
        }),
      ],
    });

    assert.deepEqual(
      flattened.map((item) => item.contextName),
      ["Men's", "Women's"]
    );
  });

  it("skips unreleased divisions", () => {
    const flattened = flattenBrackets({
      divisions: [
        division({
          released: false,
          brackets: [
            {
              name: "Gold",
              type: "single_elimination",
              tier: 0,
              matches: [],
            },
          ],
        }),
      ],
    });
    assert.deepEqual(flattened, []);
  });
});
