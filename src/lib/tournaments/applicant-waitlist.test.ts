/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadApplicantWaitlistState } from "./applicant-waitlist";

function queryResult(rows: unknown[]) {
  const query = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") {
          return (resolve: (value: unknown[]) => void) => resolve(rows);
        }
        return () => query;
      },
    }
  );
  return query;
}

function applicantSnapshotDatabase() {
  const transactionOptions: unknown[] = [];
  const snapshot = {
    select(fields: Record<string, unknown>) {
      const keys = Object.keys(fields);
      if (keys.includes("registrationCapacity")) {
        return queryResult([
          {
            status: "registration_open",
            registrationCapacity: 8,
            registrationDeadline: new Date("2027-03-01T17:00:00.000Z"),
          },
        ]);
      }
      if (keys.includes("teamName")) {
        return queryResult([
          {
            teamId: "own-team",
            teamName: "Own Team",
            university: "Own University",
            queuePosition: 9,
          },
        ]);
      }
      if (keys.includes("value")) return queryResult([{ value: 3 }]);
      if (keys.includes("queuePosition")) {
        return queryResult([
          { queuePosition: 2 },
          { queuePosition: 9 },
          { queuePosition: 15 },
        ]);
      }
      return queryResult([{ teamId: "registered-team" }]);
    },
  };
  return {
    database: {
      async transaction(
        work: (tx: typeof snapshot) => Promise<unknown>,
        options: unknown
      ) {
        transactionOptions.push(options);
        return work(snapshot);
      },
    },
    transactionOptions,
  };
}

describe("loadApplicantWaitlistState", () => {
  it("returns settings, counts, status, and a tournament-local rank from one snapshot", async () => {
    const fixture = applicantSnapshotDatabase();

    const result = await loadApplicantWaitlistState(
      { tournamentId: "tournament-one", userId: "own-user" },
      fixture.database as never
    );

    assert.deepEqual(fixture.transactionOptions, [
      { isolationLevel: "repeatable read", accessMode: "read only" },
    ]);
    assert.deepEqual(result, {
      registrationAvailability: {
        status: "registration_open",
        capacity: 8,
        deadline: "2027-03-01T17:00:00.000Z",
        registeredCount: 1,
        waitlistCount: 3,
      },
      registeredRows: [{ teamId: "registered-team" }],
      applicantWaitlistRows: [
        {
          teamId: "own-team",
          teamName: "Own Team",
          university: "Own University",
          queueRank: 2,
        },
      ],
    });
    assert.doesNotMatch(JSON.stringify(result), /queuePosition/);
  });
});
