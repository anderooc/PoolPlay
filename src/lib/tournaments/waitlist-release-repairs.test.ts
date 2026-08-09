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
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as registrationRules from "./registrations";
import * as waitlistControls from "@/app/(dashboard)/tournaments/[slug]/waitlist-controls";
import { assertExpectedRejection } from "../../../scripts/database/verify-concurrency-errors";
import { withTournamentQueueRanks } from "./waitlist-rank";

type RankedWaitlistRow = {
  id: string;
  queueRank: number;
  teamName: string;
  schoolName: string;
  requestedAt: string;
  eligible: boolean;
};

describe("organizer waitlist rank", () => {
  it("turns gapped global sequence values into tournament-local FIFO ranks", () => {
    assert.deepEqual(
      withTournamentQueueRanks([
        { id: "older", position: 12 },
        { id: "newer", position: 44 },
      ]),
      [
        { id: "older", queueRank: 1 },
        { id: "newer", queueRank: 2 },
      ]
    );
  });

  it("removes raw sequence values before the client component boundary", () => {
    const clientSource = readFileSync(
      path.join(
        process.cwd(),
        "src/app/(dashboard)/tournaments/[slug]/waitlist-controls.tsx"
      ),
      "utf8"
    );
    const panelSource = readFileSync(
      path.join(
        process.cwd(),
        "src/app/(dashboard)/tournaments/[slug]/panels/registrations-panel.tsx"
      ),
      "utf8"
    );

    assert.doesNotMatch(clientSource, /position:\s*number/);
    assert.doesNotMatch(clientSource, /withTournamentQueueRanks/);
    assert.match(panelSource, /withTournamentQueueRanks\(waitingRows\)/);
  });

  it("renders local ranks and never exposes raw sequence values", () => {
    const Table = (waitlistControls as Record<string, unknown>).WaitlistTable;
    assert.equal(typeof Table, "function");
    const rows: RankedWaitlistRow[] = [
      {
        id: "older",
        queueRank: 1,
        teamName: "Older Team",
        schoolName: "North School",
        requestedAt: "2027-03-01T17:00:00.000Z",
        eligible: true,
      },
      {
        id: "newer",
        queueRank: 2,
        teamName: "Newer Team",
        schoolName: "South School",
        requestedAt: "2027-03-01T18:00:00.000Z",
        eligible: true,
      },
    ];
    const html = renderToStaticMarkup(
      createElement(
        Table as ComponentType<{
          rows: RankedWaitlistRow[];
          canManage: boolean;
          busy: boolean;
          removingId: string | null;
          remove: (entryId: string) => Promise<void>;
        }>,
        {
          rows,
          canManage: true,
          busy: false,
          removingId: null,
          remove: async () => undefined,
        }
      )
    );

    assert.match(html, /<td[^>]*>1<\/td>/);
    assert.match(html, /<td[^>]*>2<\/td>/);
    assert.doesNotMatch(html, />12<|>44</);
  });
});

describe("registration availability locked-state policy", () => {
  it("rejects an archived tournament using the live locked date", () => {
    const policy = (
      registrationRules as Record<string, unknown>
    ).registrationAvailabilityLockedStateError;
    assert.equal(typeof policy, "function");
    assert.match(
      (
        policy as (tournamentDate: string, today: string) => string | null
      )("2027-02-28", "2027-03-01") ?? "",
      /archived/i
    );
    assert.equal(
      (policy as (tournamentDate: string, today: string) => string | null)(
        "2027-03-01",
        "2027-03-01"
      ),
      null
    );
  });

  it("checks the archived policy after the locked organizer reload", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/(dashboard)/tournaments/actions.ts"),
      "utf8"
    );
    const start = source.indexOf(
      "export async function updateTournamentRegistrationAvailability"
    );
    const end = source.indexOf(
      "export async function promoteNextWaitlistedTeam",
      start
    );
    const body = source.slice(start, end);
    const lockedReload = body.indexOf("loadLockedTournamentForOrganizer");
    const archivedPolicy = body.indexOf(
      "registrationAvailabilityLockedStateError"
    );
    const update = body.indexOf(".update(tournaments)");

    assert.ok(lockedReload >= 0);
    assert.ok(archivedPolicy > lockedReload);
    assert.ok(update > archivedPolicy);
  });
});

describe("registration replay cache effects", () => {
  it("keeps detail recovery but bounds global listing invalidation", () => {
    const cachePolicy = (
      registrationRules as Record<string, unknown>
    ).registrationPlacementCachePolicy;
    assert.equal(typeof cachePolicy, "function");

    assert.deepEqual(
      (cachePolicy as (replayed: boolean) => unknown)(false),
      { listing: true, revalidateRoutePatterns: true }
    );
    assert.deepEqual(
      (cachePolicy as (replayed: boolean) => unknown)(true),
      { listing: false, revalidateRoutePatterns: false }
    );
  });

  it("always invalidates tournament detail while applying replay policy to listing", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "src/app/(dashboard)/tournaments/[slug]/register/actions.ts"
      ),
      "utf8"
    );
    const start = source.indexOf("export async function registerTeams");
    const end = source.indexOf("export async function registerTeam(", start);
    const body = source.slice(start, end);

    assert.match(body, /registrationPlacementCachePolicy\(result\.replayed\)/);
    assert.match(body, /invalidatePublicTournamentCachesByIds/);
    assert.match(body, /registrationPlacementCachePolicy/);
    assert.match(body, /revalidateRoutePatterns/);
  });
});

describe("PostgreSQL waitlist concurrency proof", () => {
  it("detects SQLSTATE 40P01 through nested driver causes", () => {
    const deadlock = Object.assign(new Error("deadlock"), { code: "40P01" });
    const wrapped = new Error("driver wrapper", { cause: deadlock });

    assert.throws(
      () => assertExpectedRejection(
        { status: "rejected", error: wrapped },
        "driver wrapper",
        "test operation"
      ),
      /deadlock victim/
    );
  });

  it("isolates the team lock in the school deletion placement race", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "scripts/database/verify-registration-school-deletion-race.ts"
      ),
      "utf8"
    );
    const start = source.indexOf(
      "async function verifySchoolDeletionWaitsBehindPlacement"
    );
    const body = source.slice(start);

    assert.match(body, /schoolDeletionTournamentId/);
    assert.match(source, /host_school_id/);
    assert.match(source, /NULL/);
    assert.match(source, /pg_stat_activity/);
    assert.match(source, /wait_event_type/);
    assert.match(source, /FOR SHARE/);
    assert.match(source, /FOR UPDATE/);
    assert.match(body, /placement must hold the team lock/);
    assert.match(source, /effectCount/);
  });

  it("rejects deadlocks and requires the expected eligibility error", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "scripts/database/verify-registration-roster-concurrency.ts"
      ),
      "utf8"
    );
    const placementStart = source.indexOf(
      "async function verifyPlacementWaitsForSchoolRejection"
    );
    const start = source.indexOf(
      "async function verifyPromotionWaitsForSchoolDetachment"
    );
    const end = source.indexOf("async function cleanup", start);
    assert.notEqual(placementStart, -1);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const placementBody = source.slice(placementStart, start);
    const body = source.slice(start, end);

    assert.match(body, /No currently eligible teams are waiting/);
    assert.match(body, /assertExpectedRejection/);
    assert.match(body, /waitForLockWait\(sql, "teams", "FOR SHARE"\)/);
    assert.match(body, /DELETE FROM public\.tournament_waitlist_entries/);
    assert.doesNotMatch(body, /setTimeout/);
    assert.doesNotMatch(body, /\.then\(\(\) => true, \(\) => false\)/);
    assert.match(placementBody, /assertExpectedRejection/);
    assert.match(
      placementBody,
      /This team belongs to a school that is not verified yet/
    );
  });

  it("requires capacity conflict rather than any rejected promotion", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "scripts/database/verify-waitlist-promotion.ts"
      ),
      "utf8"
    );
    const start = source.indexOf("async function verifyPromotionRace");
    const end = source.indexOf(
      "async function verifySequentialSchoolDetachment",
      start
    );
    const body = source.slice(start, end);
    const barrierSource = readFileSync(
      path.join(
        process.cwd(),
        "scripts/database/verify-waitlist-promotion-race.ts"
      ),
      "utf8"
    );

    assert.match(body, /No registration slots are available/);
    assert.match(body, /assertSingleExpectedRaceRejection/);
    assert.match(body, /settlePromotionsAfterObservedTournamentLock/);
    assert.match(
      barrierSource,
      /waitForLockWait\(\s*sql, "tournaments", "FOR UPDATE", contenders\.length\s*\)/
    );
  });
});
