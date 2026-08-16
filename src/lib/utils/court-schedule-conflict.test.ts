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
  findCourtScheduleConflict,
  resolveCourtScheduleApplies,
  courtScheduleSlotKey,
} from "./court-schedule-conflict";

describe("courtScheduleSlotKey", () => {
  it("collapses times within the same minute", () => {
    const a = new Date("2026-08-16T14:00:00.000Z");
    const b = new Date("2026-08-16T14:00:45.000Z");
    assert.equal(
      courtScheduleSlotKey("court-1", a),
      courtScheduleSlotKey("court-1", b)
    );
  });
});

describe("findCourtScheduleConflict", () => {
  const occupants = [
    {
      matchId: "a",
      courtId: "c1",
      scheduledTime: new Date("2026-08-16T14:00:00.000Z"),
    },
  ];

  it("returns null when court or time is missing", () => {
    assert.equal(
      findCourtScheduleConflict(occupants, "b", null, occupants[0].scheduledTime),
      null
    );
    assert.equal(findCourtScheduleConflict(occupants, "b", "c1", null), null);
  });

  it("finds another match on the same court and time", () => {
    const hit = findCourtScheduleConflict(
      occupants,
      "b",
      "c1",
      new Date("2026-08-16T14:00:00.000Z")
    );
    assert.equal(hit?.matchId, "a");
  });

  it("ignores the same match", () => {
    assert.equal(
      findCourtScheduleConflict(
        occupants,
        "a",
        "c1",
        new Date("2026-08-16T14:00:00.000Z")
      ),
      null
    );
  });
});

describe("resolveCourtScheduleApplies", () => {
  it("keeps the already-set match when two claim the same court time", () => {
    const time = "2026-08-16T15:00:00.000Z";
    const { accepted, rejectedIds } = resolveCourtScheduleApplies(
      [
        {
          matchId: "new",
          proposedIso: time,
          courtId: "c1",
          currentTime: null,
        },
        {
          matchId: "existing",
          proposedIso: time,
          courtId: "c1",
          currentTime: new Date(time),
        },
      ],
      []
    );
    assert.deepEqual(
      accepted.map((c) => c.matchId),
      ["existing"]
    );
    assert.ok(rejectedIds.has("new"));
  });

  it("does not overwrite an occupied court slot from outside the batch", () => {
    const time = "2026-08-16T15:00:00.000Z";
    const { accepted, rejectedIds } = resolveCourtScheduleApplies(
      [
        {
          matchId: "b",
          proposedIso: time,
          courtId: "c1",
          currentTime: null,
        },
      ],
      [
        {
          matchId: "a",
          courtId: "c1",
          scheduledTime: new Date(time),
        },
      ]
    );
    assert.equal(accepted.length, 0);
    assert.ok(rejectedIds.has("b"));
  });

  it("allows the same time on different courts", () => {
    const time = "2026-08-16T15:00:00.000Z";
    const { accepted, rejectedIds } = resolveCourtScheduleApplies(
      [
        {
          matchId: "a",
          proposedIso: time,
          courtId: "c1",
          currentTime: null,
        },
        {
          matchId: "b",
          proposedIso: time,
          courtId: "c2",
          currentTime: null,
        },
      ],
      []
    );
    assert.equal(accepted.length, 2);
    assert.equal(rejectedIds.size, 0);
  });
});
