import assert from "node:assert/strict";
import type postgres from "postgres";
import { placementTeamIds } from "./verify-registration-placement";
import { assertExpectedRejection } from "./verify-concurrency-errors";

type DatabaseSql = postgres.Sql;
type RaceInput = {
  sql: DatabaseSql;
  actorId: string;
  schoolId: string;
  sourceTournamentId: string;
  operationId: string;
};

export const schoolDeletionTournamentId =
  "f0000000-0000-4000-8000-000000000065";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

async function seedIsolatedTournament(input: RaceInput): Promise<void> {
  await input.sql`
    INSERT INTO public.tournaments (
      id, organizer_id, host_school_id, gender, region, name, slug,
      date, location, status, registration_capacity, payment_enabled,
      payment_first_team_fee_cents, payment_additional_team_fee_cents
    )
    SELECT ${schoolDeletionTournamentId}, organizer_id, NULL, gender, region,
      'School Deletion Lock Isolation', 'school-deletion-lock-isolation',
      date, location, 'registration_open', 1, payment_enabled,
      payment_first_team_fee_cents, payment_additional_team_fee_cents
    FROM public.tournaments WHERE id = ${input.sourceTournamentId}
  `;
}

async function beginSchoolRejection(input: RaceInput): Promise<{
  rejection: Promise<unknown>;
  release: () => void;
}> {
  const started = deferred();
  const allowCommit = deferred();
  const rejection = input.sql.begin(async (adminTx) => {
    await adminTx`UPDATE public.schools SET verification_status = 'rejected'
      WHERE id = ${input.schoolId}`;
    started.resolve();
    await allowCommit.promise;
  });
  await started.promise;
  return { rejection, release: allowCommit.resolve };
}

export async function waitForLockWait(
  sql: DatabaseSql,
  relationName: "schools" | "teams" | "tournaments",
  lockClause: "FOR SHARE" | "FOR UPDATE",
  minimumWaiters = 1
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const [row] = await sql<{ waiting: boolean }[]>`
      SELECT count(*) >= ${minimumWaiters} AS waiting
        FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid()
          AND state = 'active' AND wait_event_type = 'Lock'
          AND query ILIKE ${`%${relationName}%`}
          AND query ILIKE ${`%${lockClause}%`}
    `;
    if (row.waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(
    `Timed out waiting for ${minimumWaiters} ${relationName} ${lockClause}`
  );
}

async function assertFinalState(input: RaceInput): Promise<void> {
  const [state] = await input.sql<{
    effectCount: number; schoolCount: number; schoolId: string | null;
    verificationStatus: string;
  }[]>`
    SELECT
      ((SELECT count(*) FROM public.registrations WHERE tournament_id = ${schoolDeletionTournamentId}) +
       (SELECT count(*) FROM public.registration_payments WHERE tournament_id = ${schoolDeletionTournamentId}) +
       (SELECT count(*) FROM public.registration_status_events WHERE tournament_id = ${schoolDeletionTournamentId}) +
       (SELECT count(*) FROM public.tournament_waitlist_entries WHERE tournament_id = ${schoolDeletionTournamentId}))::int AS "effectCount",
      (SELECT count(*)::int FROM public.schools WHERE id = ${input.schoolId}) AS "schoolCount",
      school_id AS "schoolId", verification_status AS "verificationStatus"
    FROM public.teams WHERE id = ${placementTeamIds[0]}
  `;
  assert.deepEqual(state, {
    effectCount: 0, schoolCount: 0, schoolId: null,
    verificationStatus: "pending",
  });
}

export async function verifySchoolDeletionWaitsBehindPlacement(
  input: RaceInput
): Promise<void> {
  await seedIsolatedTournament(input);
  const { registerTeamsAtomically } = await import(
    "../../src/lib/tournaments/registrations"
  );
  const { deleteSchoolWithEligibilityLocks } = await import(
    "../../src/lib/schools/school-deletion"
  );
  const gate = await beginSchoolRejection(input);
  let placementSettled = false;
  const placement = registerTeamsAtomically({
    tournamentId: schoolDeletionTournamentId,
    teamIds: [placementTeamIds[0]],
    actor: { id: input.actorId, role: "captain" },
    operationId: input.operationId,
  }).then(
    () => ({ status: "fulfilled" as const }),
    (error: unknown) => ({ status: "rejected" as const, error })
  ).finally(() => { placementSettled = true; });
  let deletion!: ReturnType<typeof deleteSchoolWithEligibilityLocks>;
  try {
    await waitForLockWait(input.sql, "schools", "FOR SHARE");
    assert.equal(placementSettled, false, "placement must wait for school");
    let deletionSettled = false;
    deletion = deleteSchoolWithEligibilityLocks({
      schoolId: input.schoolId, authorize: async () => null,
      afterCommit: async () => {},
    }).finally(() => { deletionSettled = true; });
    await waitForLockWait(input.sql, "teams", "FOR UPDATE");
    assert.equal(deletionSettled, false,
      "school deletion must wait because placement must hold the team lock");
  } finally {
    gate.release();
  }
  await gate.rejection;
  assertExpectedRejection(await placement,
    "This team belongs to a school that is not verified yet and cannot register for tournaments.",
    "placement");
  assert.equal((await deletion).ok, true);
  await assertFinalState(input);
}
