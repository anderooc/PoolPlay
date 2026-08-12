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
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import * as validators from "@/lib/validators";

type AvailabilitySchema = {
  safeParse(input: unknown):
    | { success: true; data: { capacity: number | null; deadline: string | null } }
    | { success: false; error: { issues: Array<{ message: string }> } };
};

function availabilitySchema(): AvailabilitySchema {
  const schema = (validators as Record<string, unknown>)[
    "registrationAvailabilitySchema"
  ];
  assert.ok(schema, "Missing registrationAvailabilitySchema");
  return schema as AvailabilitySchema;
}

const actionManifest: Record<string, string[]> = {
  "src/app/(dashboard)/tournaments/actions.ts": [
    "bulkRemoveRegistrations",
    "updateTournamentRegistrationAvailability",
    "promoteNextWaitlistedTeam",
    "removeWaitlistedTeam",
  ],
  "src/app/(dashboard)/tournaments/[slug]/register/actions.ts": [
    "registerTeams",
    "withdrawRegistration",
  ],
  "src/app/(dashboard)/admin/actions.ts": [
    "adminDeleteTeam",
    "adminDeleteSchool",
  ],
  "src/app/(dashboard)/schools/actions.ts": ["deleteSchool"],
  "src/app/(dashboard)/teams/actions.ts": ["deleteTeam"],
};

const idBasedInvalidationManifest: Record<string, string[]> = {
  "src/app/(dashboard)/tournaments/actions.ts": [
    "bulkRemoveRegistrations",
  ],
  "src/app/(dashboard)/tournaments/[slug]/register/actions.ts": [
    "registerTeams",
    "withdrawRegistration",
  ],
  "src/app/(dashboard)/admin/actions.ts": [
    "adminDeleteTeam",
    "adminDeleteSchool",
  ],
  "src/app/(dashboard)/schools/actions.ts": ["deleteSchool"],
  "src/app/(dashboard)/teams/actions.ts": ["deleteTeam"],
};

function functionBody(source: string, functionName: string): string {
  const signature = new RegExp(
    `(?:export\\s+)?async\\s+function\\s+${functionName}(?:<[^>]+>)?\\s*\\(`
  );
  const match = signature.exec(source);
  assert.ok(match, `Missing action ${functionName}`);

  const openParen = source.indexOf("(", match.index);
  let parenDepth = 0;
  let closeParen = -1;
  for (let index = openParen; index < source.length; index += 1) {
    if (source[index] === "(") parenDepth += 1;
    if (source[index] === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        closeParen = index;
        break;
      }
    }
  }
  assert.notEqual(closeParen, -1, `Missing parameters for ${functionName}`);

  const openBrace = source.indexOf("{", closeParen);
  assert.notEqual(openBrace, -1, `Missing body for ${functionName}`);

  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openBrace, index + 1);
    }
  }
  assert.fail(`Unclosed body for ${functionName}`);
}

describe("public tournament cache invalidation policy", () => {
  for (const [file, actionNames] of Object.entries(actionManifest)) {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");

    for (const actionName of actionNames) {
      it(`${actionName} invalidates every affected public cache`, () => {
        assert.match(
          functionBody(source, actionName),
          /invalidatePublicTournament|invalidateTournamentRegistrationAvailability/,
          `${file}#${actionName} must use the centralized invalidation helper`
        );
      });
    }
  }

  for (const [file, actionNames] of Object.entries(
    idBasedInvalidationManifest
  )) {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");

    for (const actionName of actionNames) {
      it(`${actionName} resolves the current slug after its mutation`, () => {
        assert.match(
          functionBody(source, actionName),
          /await\s+invalidatePublicTournamentCachesByIds/,
          `${file}#${actionName} must avoid a concurrent-rename cache race`
        );
      });
    }
  }

  it("the organizer tournament loader takes the row lock used by rename", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "src/lib/tournaments/locked-tournament-authorization.ts"
      ),
      "utf8"
    );
    assert.match(source, /\.for\("update"\)|FOR UPDATE/i);
  });

  it("registration availability is authorized and counted under one lock", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/(dashboard)/tournaments/actions.ts"),
      "utf8"
    );
    const body = functionBody(source, "updateTournamentRegistrationAvailability");
    assert.match(body, /db\.transaction/);
    assert.match(body, /loadLockedTournamentForOrganizer/);
    assert.match(body, /registrations/);
    assert.match(body, /registrationCapacity/);
    assert.match(body, /registrationDeadline/);
  });

  it("registration availability mutations share the exact cache policy", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/(dashboard)/tournaments/actions.ts"),
      "utf8"
    );
    const body = functionBody(
      source,
      "invalidateTournamentRegistrationAvailability"
    );
    for (const pathName of [
      "/tournaments",
      "/explore",
      "/dashboard",
      "/tournaments/[slug]",
      "/tournaments/[slug]/register",
    ]) {
      assert.ok(body.includes(pathName), `Missing invalidation for ${pathName}`);
    }
    assert.match(body, /await\s+invalidatePublicTournamentCachesByIds/);
    assert.match(body, /listing:\s*true/);
  });

  for (const [actionName, successBoundary] of [
    [
      "updateTournamentRegistrationAvailability",
      'if ("error" in result) return result',
    ],
    ["promoteNextWaitlistedTeam", "promoteNextWaitlistedTeamAtomically"],
    ["removeWaitlistedTeam", "removeWaitlistEntryAtomically"],
  ] as const) {
    it(`${actionName} invalidates only after definite success`, () => {
      const source = readFileSync(
        path.join(process.cwd(), "src/app/(dashboard)/tournaments/actions.ts"),
        "utf8"
      );
      const body = functionBody(source, actionName);
      const invalidation = body.indexOf(
        "await invalidateTournamentRegistrationAvailability"
      );
      assert.notEqual(invalidation, -1);
      assert.ok(body.indexOf(successBoundary) < invalidation);
      assert.equal(
        body.match(/invalidateTournamentRegistrationAvailability/g)?.length,
        1
      );
      const catchIndex = body.indexOf("catch");
      if (catchIndex !== -1) {
        assert.doesNotMatch(
          body.slice(catchIndex),
          /invalidateTournamentRegistrationAvailability/
        );
      }
    });
  }

  for (const [file, actionName, successBoundary] of [
    [
      "src/app/(dashboard)/tournaments/[slug]/register/actions.ts",
      "registerTeams",
      "registerTeamsAtomically",
    ],
    [
      "src/app/(dashboard)/tournaments/[slug]/register/actions.ts",
      "withdrawRegistration",
      "withdrawRegistrationAtomically",
    ],
    [
      "src/app/(dashboard)/tournaments/actions.ts",
      "bulkRemoveRegistrations",
      "removeRegistrationsAtomically",
    ],
    [
      "src/app/(dashboard)/teams/actions.ts",
      "deleteTeam",
      "deleteTeamWithTournamentLocks",
    ],
    [
      "src/app/(dashboard)/admin/actions.ts",
      "adminDeleteTeam",
      "deleteTeamWithTournamentLocks",
    ],
  ] as const) {
    it(`${actionName} applies listing invalidation only after commit`, () => {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      const body = functionBody(source, actionName);
      const success = body.indexOf(successBoundary);
      const invalidation = body.indexOf(
        "await invalidatePublicTournamentCachesByIds"
      );
      assert.notEqual(success, -1);
      assert.ok(success < invalidation);
      if (actionName === "registerTeams") {
        const policy = body.indexOf(
          "registrationPlacementCachePolicy(result.replayed)"
        );
        assert.ok(success < policy);
        assert.ok(policy < invalidation);
      } else {
        assert.match(body.slice(invalidation), /listing:\s*true/);
      }
      const catchIndex = body.indexOf("catch");
      if (successBoundary === "deleteTeamWithTournamentLocks") {
        assert.match(body.slice(success, invalidation), /afterCommit/);
      } else if (catchIndex !== -1) {
        assert.ok(catchIndex < invalidation);
      }
    });
  }

  it("team parent discovery includes registration and waiting rows", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "src/lib/tournaments/public-cache-invalidation.ts"
      ),
      "utf8"
    );
    const body = functionBody(source, "publicTournamentIdsForTeam");
    assert.match(body, /registrations/);
    assert.match(body, /tournamentWaitlistEntries/);
    assert.match(body, /poolTeams/);
    assert.match(body, /matches/);
  });

  it("both organizer pickers exclude every waiting team", () => {
    for (const file of [
      "src/app/(dashboard)/tournaments/[slug]/register/page.tsx",
      "src/app/(dashboard)/tournaments/[slug]/register/actions.ts",
    ]) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      assert.match(source, /waitingTeamIdsForTournament/);
    }
  });
});

describe("school deletion lock order", () => {
  it("both school deletion actions use the shared lock service", () => {
    for (const [file, actionName] of [
      ["src/app/(dashboard)/schools/actions.ts", "deleteSchool"],
      ["src/app/(dashboard)/admin/actions.ts", "adminDeleteSchool"],
    ] as const) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      assert.match(
        functionBody(source, actionName),
        /deleteSchoolWithEligibilityLocks/
      );
    }
  });

  it("the shared service locks sorted teams before the school", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "src/lib/schools/school-deletion.ts"
      ),
      "utf8"
    );
    const body = functionBody(source, "attemptSchoolDeletion");
    const parentLock = body.indexOf("store.lockParents");
    const teamLock = body.indexOf("store.lockTeams");
    const schoolLock = body.indexOf("store.lockSchool");
    assert.ok(parentLock < teamLock);
    assert.ok(teamLock < schoolLock);
    assert.match(body, /currentParentIds/);
    const verifier = readFileSync(
      path.join(
        process.cwd(),
        "scripts/database/verify-registration-roster-concurrency.ts"
      ),
      "utf8"
    );
    assert.match(verifier, /verifySchoolDeletionWaitsBehindPlacement/);
  });

  it("listing invalidation does not require affected tournament IDs", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/tournaments/public-cache-invalidation.ts"),
      "utf8"
    );
    const body = functionBody(source, "invalidatePublicTournamentCachesByIds");
    assert.match(body, /options\?\.listing/);
    assert.match(body, /invalidatePublicTournamentCaches\(\[\], options\)/);
  });
});

describe("registration availability validation", () => {
  it("normalizes blank capacity and deadline values to null", () => {
    const result = availabilitySchema().safeParse({
      capacity: "  ",
      deadline: "",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data, { capacity: null, deadline: null });
    }
  });

  for (const capacity of [0, -1, 1.5]) {
    it(`rejects invalid capacity ${capacity}`, () => {
      const result = availabilitySchema().safeParse({
        capacity,
        deadline: null,
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0]?.message ?? "", /positive integer/i);
      }
    });
  }

  for (const deadline of ["tomorrow", "2026-02-30T12:00:00Z"] ) {
    it(`rejects invalid deadline ${deadline}`, () => {
      const result = availabilitySchema().safeParse({ capacity: null, deadline });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0]?.message ?? "", /valid.*timezone/i);
      }
    });
  }
});
