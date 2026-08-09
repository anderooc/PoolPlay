/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allocateRegistrationCapacity,
  capacityAvailable,
  registrationDeadlinePassed,
} from "./waitlist-policy";

describe("allocateRegistrationCapacity", () => {
  it("fills remaining slots in request order and waitlists the rest", () => {
    assert.deepEqual(
      allocateRegistrationCapacity({
        teamIds: ["team-a", "team-b", "team-c"],
        capacity: 5,
        activeRegistrationCount: 3,
      }),
      {
        acceptedTeamIds: ["team-a", "team-b"],
        waitlistedTeamIds: ["team-c"],
      }
    );
  });

  it("waitlists the full batch when no slots remain", () => {
    assert.deepEqual(
      allocateRegistrationCapacity({
        teamIds: ["team-a", "team-b"],
        capacity: 2,
        activeRegistrationCount: 2,
      }),
      {
        acceptedTeamIds: [],
        waitlistedTeamIds: ["team-a", "team-b"],
      }
    );
  });

  it("accepts the full batch when it fits", () => {
    assert.deepEqual(
      allocateRegistrationCapacity({
        teamIds: ["team-a", "team-b"],
        capacity: 4,
        activeRegistrationCount: 2,
      }),
      {
        acceptedTeamIds: ["team-a", "team-b"],
        waitlistedTeamIds: [],
      }
    );
  });

  it("rejects a negative active registration count", () => {
    assert.throws(
      () =>
        allocateRegistrationCapacity({
          teamIds: ["team-a"],
          capacity: 4,
          activeRegistrationCount: -1,
        }),
      RangeError
    );
  });
});

describe("registrationDeadlinePassed", () => {
  it("treats an exact database deadline as closed", () => {
    const instant = new Date("2027-03-01T17:00:00.000Z");

    assert.equal(registrationDeadlinePassed(instant, instant), true);
  });

  it("keeps registration open one millisecond before the deadline", () => {
    const databaseNow = new Date("2027-03-01T16:59:59.999Z");
    const deadline = new Date("2027-03-01T17:00:00.000Z");

    assert.equal(registrationDeadlinePassed(deadline, databaseNow), false);
  });
});

describe("capacityAvailable", () => {
  it("treats null capacity as unlimited", () => {
    assert.equal(capacityAvailable(null, 50_000), true);
  });

  it("reports no capacity when zero slots remain", () => {
    assert.equal(capacityAvailable(2, 2), false);
  });

  it("rejects a negative active registration count", () => {
    assert.throws(() => capacityAvailable(4, -1), RangeError);
  });
});
