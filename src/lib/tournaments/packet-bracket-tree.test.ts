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
import { buildPacketBracketStructures } from "@/lib/tournaments/packet-bracket-tree";

describe("buildPacketBracketStructures", () => {
  it("groups matches by bracket and round with team names", () => {
    const teamNameById = new Map([
      ["t1", "Alpha"],
      ["t2", "Beta"],
      ["t3", "Gamma"],
      ["t4", "Delta"],
    ]);

    const structures = buildPacketBracketStructures({
      brackets: [{ id: "b1", name: "Gold", tier: 1 }],
      matches: [
        {
          bracketId: "b1",
          bracketRound: 1,
          bracketPosition: 1,
          teamAId: "t1",
          teamBId: "t2",
        },
        {
          bracketId: "b1",
          bracketRound: 1,
          bracketPosition: 2,
          teamAId: "t3",
          teamBId: "t4",
        },
        {
          bracketId: "b1",
          bracketRound: 2,
          bracketPosition: 1,
          teamAId: null,
          teamBId: null,
        },
      ],
      teamNameById,
    });

    assert.equal(structures.length, 1);
    assert.equal(structures[0]!.name, "Gold Bracket");
    assert.equal(structures[0]!.rounds.length, 2);
    assert.equal(structures[0]!.rounds[0]!.label, "Semifinals");
    assert.equal(structures[0]!.rounds[1]!.label, "Final");
    assert.deepEqual(structures[0]!.rounds[0]!.matches[0], {
      position: 1,
      teamAName: "Alpha",
      teamBName: "Beta",
      isBye: false,
    });
  });

  it("marks round-one bye matches", () => {
    const teamNameById = new Map([["t1", "Alpha"]]);

    const structures = buildPacketBracketStructures({
      brackets: [{ id: "b1", name: null, tier: 1 }],
      matches: [
        {
          bracketId: "b1",
          bracketRound: 1,
          bracketPosition: 1,
          teamAId: "t1",
          teamBId: null,
        },
      ],
      teamNameById,
    });

    assert.equal(structures[0]!.rounds[0]!.matches[0]!.isBye, true);
    assert.equal(structures[0]!.rounds[0]!.matches[0]!.teamBName, "BYE");
  });
});
