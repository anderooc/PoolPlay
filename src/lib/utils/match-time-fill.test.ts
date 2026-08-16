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
  assignIndexWaves,
  fillableCount,
  proposeMatchTimeFill,
  type MatchTimeFillInput,
} from "./match-time-fill";

const T0 = new Date("2026-08-15T13:00:00.000Z");
const T1 = new Date("2026-08-15T14:00:00.000Z");
const T2 = new Date("2026-08-15T15:00:00.000Z");

function poolMatch(
  partial: Partial<MatchTimeFillInput> &
    Pick<MatchTimeFillInput, "id" | "groupId" | "wave">
): MatchTimeFillInput {
  return {
    groupName: partial.groupId === "a" ? "Pool A" : "Pool B",
    status: "upcoming",
    scheduledTime: null,
    courtId: null,
    teamAName: "Alpha",
    teamBName: "Beta",
    isBye: false,
    ...partial,
  };
}

describe("assignIndexWaves", () => {
  it("gives matching indexes across pools the same wave", () => {
    const waves = assignIndexWaves(
      new Map([
        ["a", ["a0", "a1"]],
        ["b", ["b0", "b1"]],
      ])
    );
    assert.equal(waves.get("a0"), 0);
    assert.equal(waves.get("b0"), 0);
    assert.equal(waves.get("a1"), 1);
    assert.equal(waves.get("b1"), 1);
  });
});

describe("proposeMatchTimeFill", () => {
  it("copies the first start to the same wave on other courts, then steps by interval", () => {
    const rows = proposeMatchTimeFill({
      firstStart: T0,
      intervalMinutes: 60,
      overwrite: false,
      matches: [
        poolMatch({
          id: "a0",
          groupId: "a",
          wave: 0,
          teamAName: "A1",
          teamBName: "A2",
        }),
        poolMatch({
          id: "a1",
          groupId: "a",
          wave: 1,
          teamAName: "A1",
          teamBName: "A3",
        }),
        poolMatch({
          id: "b0",
          groupId: "b",
          wave: 0,
          teamAName: "B1",
          teamBName: "B2",
        }),
        poolMatch({
          id: "b1",
          groupId: "b",
          wave: 1,
          teamAName: "B1",
          teamBName: "B3",
        }),
      ],
    });

    const byId = new Map(rows.map((row) => [row.matchId, row]));
    assert.equal(byId.get("a0")?.kind, "apply");
    assert.equal(byId.get("a0")?.proposedIso, T0.toISOString());
    assert.equal(byId.get("b0")?.kind, "apply");
    assert.equal(byId.get("b0")?.proposedIso, T0.toISOString());
    assert.equal(byId.get("a1")?.proposedIso, T1.toISOString());
    assert.equal(byId.get("b1")?.proposedIso, T1.toISOString());
    assert.equal(fillableCount(rows), 4);
  });

  it("fills every wave from the first playable wave", () => {
    const rows = proposeMatchTimeFill({
      firstStart: T0,
      intervalMinutes: 60,
      overwrite: false,
      matches: [
        poolMatch({ id: "a0", groupId: "a", wave: 0 }),
        poolMatch({ id: "a1", groupId: "a", wave: 1 }),
        poolMatch({ id: "a2", groupId: "a", wave: 2 }),
      ],
    });
    assert.equal(rows.find((row) => row.matchId === "a0")?.proposedIso, T0.toISOString());
    assert.equal(rows.find((row) => row.matchId === "a1")?.proposedIso, T1.toISOString());
    assert.equal(rows.find((row) => row.matchId === "a2")?.proposedIso, T2.toISOString());
  });

  it("skips completed and in-progress matches even with overwrite on", () => {
    const rows = proposeMatchTimeFill({
      firstStart: T0,
      intervalMinutes: 60,
      overwrite: true,
      matches: [
        poolMatch({ id: "a0", groupId: "a", wave: 0 }),
        poolMatch({
          id: "b0",
          groupId: "b",
          wave: 0,
          status: "completed",
        }),
        poolMatch({
          id: "b1",
          groupId: "b",
          wave: 1,
          status: "in_progress",
        }),
      ],
    });
    assert.equal(rows.find((row) => row.matchId === "b0")?.kind, "locked");
    assert.equal(rows.find((row) => row.matchId === "b1")?.kind, "locked");
    assert.equal(fillableCount(rows), 1);
  });

  it("keeps existing times unless overwrite is on", () => {
    const existing = new Date("2026-08-15T16:00:00.000Z");
    const withoutOverwrite = proposeMatchTimeFill({
      firstStart: T0,
      intervalMinutes: 60,
      overwrite: false,
      matches: [
        poolMatch({ id: "a0", groupId: "a", wave: 0 }),
        poolMatch({
          id: "b0",
          groupId: "b",
          wave: 0,
          scheduledTime: existing,
        }),
      ],
    });
    assert.equal(withoutOverwrite.find((row) => row.matchId === "b0")?.kind, "keep");

    const withOverwrite = proposeMatchTimeFill({
      firstStart: T0,
      intervalMinutes: 60,
      overwrite: true,
      matches: [
        poolMatch({ id: "a0", groupId: "a", wave: 0 }),
        poolMatch({
          id: "b0",
          groupId: "b",
          wave: 0,
          scheduledTime: existing,
        }),
      ],
    });
    assert.equal(withOverwrite.find((row) => row.matchId === "b0")?.kind, "apply");
    assert.equal(
      withOverwrite.find((row) => row.matchId === "b0")?.proposedIso,
      T0.toISOString()
    );
  });

  it("skips bye matches", () => {
    const rows = proposeMatchTimeFill({
      firstStart: T0,
      intervalMinutes: 60,
      overwrite: false,
      matches: [
        {
          id: "r1",
          groupId: "gold",
          groupName: "Gold",
          wave: 1,
          status: "upcoming",
          scheduledTime: null,
          courtId: null,
          teamAName: "Seed 1",
          teamBName: "Seed 8",
          isBye: false,
        },
        {
          id: "bye",
          groupId: "gold",
          groupName: "Gold",
          wave: 1,
          status: "upcoming",
          scheduledTime: null,
          courtId: null,
          teamAName: "Seed 2",
          teamBName: null,
          isBye: true,
        },
      ],
    });
    assert.equal(
      rows.find((row) => row.matchId === "bye"),
      undefined
    );
    assert.equal(rows.find((row) => row.matchId === "r1")?.kind, "apply");
  });

  it("skips a same-court collision and keeps the already-set match", () => {
    const rows = proposeMatchTimeFill({
      firstStart: T0,
      intervalMinutes: 60,
      overwrite: true,
      matches: [
        poolMatch({
          id: "a0",
          groupId: "a",
          wave: 0,
          courtId: "c1",
          scheduledTime: T0,
        }),
        poolMatch({
          id: "b0",
          groupId: "b",
          wave: 0,
          courtId: "c1",
          scheduledTime: null,
        }),
      ],
    });
    assert.equal(rows.find((row) => row.matchId === "a0")?.kind, "keep");
    assert.equal(rows.find((row) => row.matchId === "b0")?.kind, "keep");
    assert.equal(rows.find((row) => row.matchId === "b0")?.courtConflict, true);
  });
});
