import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import path from "node:path";

it("tournament creation locks host teams before the school", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/lib/tournaments/tournament-creation.ts"),
    "utf8"
  );
  const attemptStart = source.indexOf("async function attemptTournamentCreation");
  const body = source.slice(attemptStart);
  const teamLock = body.indexOf("lockHostTeams");
  const schoolLock = body.indexOf("loadAuthorizedHost");
  const insert = body.indexOf("insertTournamentAndRegistrations");
  assert.notEqual(attemptStart, -1);
  assert.ok(teamLock < schoolLock);
  assert.ok(schoolLock < insert);
  assert.match(body, /currentIds/);
  assert.match(body, /missingIds/);
});

it("the PostgreSQL verifier covers creation versus school deletion", () => {
  const source = readFileSync(
    path.join(process.cwd(), "scripts/database/verify-team-deletion-locking.ts"),
    "utf8"
  );
  assert.match(source, /verifyTournamentCreationWaitsForSchoolDeletion/);
  assert.match(source, /40P01/);
});
