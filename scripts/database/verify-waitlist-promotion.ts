import assert from "node:assert/strict";
import type postgres from "postgres";
import type { db } from "../../src/lib/db";
import { placementTeamIds } from "./verify-registration-placement";
import { assertSingleExpectedRaceRejection } from "./verify-concurrency-errors";
import { settlePromotionsAfterObservedTournamentLock } from "./verify-waitlist-promotion-race";

type DatabaseSql = postgres.Sql;
type WaitlistDatabase = Pick<typeof db, "transaction">;
type WaitlistContext = {
  sql: DatabaseSql;
  actorId: string;
  schoolId: string;
  tournamentId: string;
  database?: WaitlistDatabase;
};
export const waitlistCaptainId = "f0000000-0000-4000-8000-000000000003";
export const waitlistHostOfficerId =
  "f0000000-0000-4000-8000-000000000005";
export const waitlistReplayTournamentId =
  "f0000000-0000-4000-8000-000000000031";
const promotionOperationIds = [
  "f0000000-0000-4000-8000-000000000060",
  "f0000000-0000-4000-8000-000000000061",
] as const;
const scopedReplayOperationId = "f0000000-0000-4000-8000-000000000062";
const eligibilityOperationId = "f0000000-0000-4000-8000-000000000063";
async function seedWaitlistActors(context: WaitlistContext): Promise<void> {
  const { sql, schoolId } = context;
  await sql`
    INSERT INTO public.users (id, auth_id, email, full_name, role)
    VALUES
      (${waitlistCaptainId}, 'f0000000-0000-4000-8000-000000000004',
        'waitlist-captain@example.test', 'Waitlist Captain', 'captain'),
      (${waitlistHostOfficerId}, 'f0000000-0000-4000-8000-000000000006',
        'waitlist-host@example.test', 'Waitlist Host', 'captain')
  `;
  await sql`
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (${placementTeamIds[0]}, ${waitlistCaptainId}, 'captain')
  `;
  await sql`
    INSERT INTO public.school_members (school_id, user_id, role)
    VALUES (${schoolId}, ${waitlistHostOfficerId}, 'officer')
  `;
}
async function resetWaitlistState(context: WaitlistContext): Promise<void> {
  const { sql, tournamentId } = context;
  await sql`DELETE FROM public.tournaments WHERE id = ${waitlistReplayTournamentId}`;
  await sql`DELETE FROM public.tournament_waitlist_entries WHERE tournament_id = ${tournamentId}`;
  await sql`DELETE FROM public.registration_status_events WHERE tournament_id = ${tournamentId}`;
  await sql`DELETE FROM public.registrations WHERE tournament_id = ${tournamentId}`;
  await sql`
    UPDATE public.teams SET gender = 'mens', school_id = ${context.schoolId},
      verification_status = 'verified'
    WHERE id IN (${placementTeamIds[0]}, ${placementTeamIds[1]}, ${placementTeamIds[2]})
  `;
  await sql`UPDATE public.schools SET verification_status = 'verified'
    WHERE id = ${context.schoolId}`;
  await sql`
    UPDATE public.tournaments SET status = 'registration_open',
      registration_capacity = 1, registration_deadline = NULL
    WHERE id = ${tournamentId}
  `;
}
async function seedWaitlist(
  context: WaitlistContext,
  teamIds: readonly string[],
  tournamentId: string = context.tournamentId
): Promise<void> {
  for (const teamId of teamIds) {
    await context.sql`
      INSERT INTO public.tournament_waitlist_entries (
        tournament_id, team_id, requested_by_user_id, request_operation_id
      ) VALUES (${tournamentId}, ${teamId}, ${waitlistCaptainId}, gen_random_uuid())
    `;
  }
}
async function effectCounts(
  context: WaitlistContext,
  tournamentId: string = context.tournamentId
): Promise<{
  registrations: number;
  payments: number;
  promotionEvents: number;
  promoted: number;
  waiting: number;
}> {
  const [counts] = await context.sql<{
    registrations: number;
    payments: number;
    promotionEvents: number;
    promoted: number;
    waiting: number;
  }[]>`
    SELECT
      (SELECT count(*)::int FROM public.registrations
        WHERE tournament_id = ${tournamentId}) AS registrations,
      (SELECT count(*)::int FROM public.registration_payments
        WHERE tournament_id = ${tournamentId}) AS payments,
      (SELECT count(*)::int FROM public.registration_status_events
        WHERE tournament_id = ${tournamentId}
          AND reason = 'waitlist_promoted') AS "promotionEvents",
      (SELECT count(*)::int FROM public.tournament_waitlist_entries
        WHERE tournament_id = ${tournamentId} AND status = 'promoted') AS promoted,
      (SELECT count(*)::int FROM public.tournament_waitlist_entries
        WHERE tournament_id = ${tournamentId} AND status = 'waiting') AS waiting
  `;
  return counts;
}

async function assertPromotionRows(
  context: WaitlistContext,
  expectedTeamId: string,
  expectedAmountCents: number,
  expectedResolverId: string = context.actorId
): Promise<void> {
  const [row] = await context.sql`
    SELECT registration.status AS registration_status,
      payment.status AS payment_status, payment.amount_cents, event.reason,
      entry.resolved_at, entry.resolved_by_user_id,
      entry.resolution_operation_id, entry.registration_id
    FROM public.tournament_waitlist_entries entry
    JOIN public.registrations registration ON registration.id = entry.registration_id
    JOIN public.registration_payments payment ON payment.registration_id = registration.id
    JOIN public.registration_status_events event ON event.registration_id = registration.id
    WHERE entry.tournament_id = ${context.tournamentId}
      AND entry.team_id = ${expectedTeamId}
  `;
  assert.equal(row.registration_status, "pending");
  assert.equal(row.payment_status, "unpaid");
  assert.equal(row.amount_cents, expectedAmountCents);
  assert.equal(row.reason, "waitlist_promoted");
  assert.ok(row.resolved_at && row.resolution_operation_id);
  assert.equal(row.resolved_by_user_id, expectedResolverId);
  assert.ok(row.registration_id);
}

async function verifyPromotionAuthorization(
  context: WaitlistContext
): Promise<void> {
  const { promoteNextWaitlistedTeamAtomically } = await import(
    "../../src/lib/tournaments/waitlist-operations"
  );
  await resetWaitlistState(context);
  await seedWaitlist(context, [placementTeamIds[1]]);
  await assert.rejects(
    () => promoteNextWaitlistedTeamAtomically({
      tournamentId: context.tournamentId,
      actorUserId: waitlistCaptainId,
      operationId: promotionOperationIds[0],
    }, context.database),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "Only the organizer can update the tournament waitlist."
  );
  assert.deepEqual(await effectCounts(context), {
    registrations: 0, payments: 0, promotionEvents: 0,
    promoted: 0, waiting: 1,
  });
  const result = await promoteNextWaitlistedTeamAtomically({
    tournamentId: context.tournamentId,
    actorUserId: waitlistHostOfficerId,
    operationId: promotionOperationIds[0],
  }, context.database);
  assert.equal(result.teamId, placementTeamIds[1]);
  assert.deepEqual(await effectCounts(context), {
    registrations: 1, payments: 1, promotionEvents: 1,
    promoted: 1, waiting: 0,
  });
  await assertPromotionRows(
    context,
    placementTeamIds[1],
    10000,
    waitlistHostOfficerId
  );
}

async function seedReplayTournament(context: WaitlistContext): Promise<void> {
  const { sql, actorId, schoolId } = context;
  await sql`
    INSERT INTO public.tournaments (
      id, organizer_id, host_school_id, gender, region, name, slug,
      date, location, status, registration_capacity, payment_enabled,
      payment_first_team_fee_cents, payment_additional_team_fee_cents
    )
    SELECT ${waitlistReplayTournamentId}, ${actorId}, ${schoolId}, gender, region,
      'Roster Replay', 'roster-replay', date, location, 'registration_open', 1,
      payment_enabled, payment_first_team_fee_cents,
      payment_additional_team_fee_cents
    FROM public.tournaments WHERE id = ${context.tournamentId}
  `;
}

async function verifyTournamentScopedReplay(
  context: WaitlistContext
): Promise<void> {
  const { promoteNextWaitlistedTeamAtomically } = await import(
    "../../src/lib/tournaments/waitlist-operations"
  );
  await resetWaitlistState(context);
  await seedReplayTournament(context);
  await seedWaitlist(context, [placementTeamIds[0]]);
  await seedWaitlist(context, [placementTeamIds[1]], waitlistReplayTournamentId);
  const firstInput = { tournamentId: context.tournamentId,
    actorUserId: context.actorId, operationId: scopedReplayOperationId };
  const secondInput = { ...firstInput, tournamentId: waitlistReplayTournamentId };
  const first = await promoteNextWaitlistedTeamAtomically(
    firstInput,
    context.database
  );
  const second = await promoteNextWaitlistedTeamAtomically(
    secondInput,
    context.database
  );
  assert.equal(first.teamId, placementTeamIds[0]);
  assert.equal(second.teamId, placementTeamIds[1]);
  assert.deepEqual(await promoteNextWaitlistedTeamAtomically(
    firstInput,
    context.database
  ), {
    ...first, replayed: true,
  });
  assert.deepEqual(await promoteNextWaitlistedTeamAtomically(
    secondInput,
    context.database
  ), {
    ...second, replayed: true,
  });
  assert.equal((await effectCounts(context)).promoted, 1);
  assert.equal((await effectCounts(context, waitlistReplayTournamentId)).promoted, 1);
}

async function withdrawPromotedRegistration(
  context: WaitlistContext,
  teamId: string
): Promise<void> {
  if (context.database) {
    await context.sql`
      DELETE FROM public.registrations
      WHERE tournament_id = ${context.tournamentId} AND team_id = ${teamId}
    `;
    return;
  }
  const { withdrawRegistrationAtomically } = await import(
    "../../src/lib/tournaments/registration-roster-mutations"
  );
  await withdrawRegistrationAtomically({
    tournamentId: context.tournamentId,
    teamId,
    actorUserId: context.actorId,
  });
}

async function verifyPromotionAndReplay(context: WaitlistContext): Promise<void> {
  const { promoteNextWaitlistedTeamAtomically } = await import(
    "../../src/lib/tournaments/waitlist-operations"
  );
  await resetWaitlistState(context);
  await context.sql`UPDATE public.teams SET gender = 'womens' WHERE id = ${placementTeamIds[0]}`;
  await context.sql`
    UPDATE public.tournaments SET status = 'registration_closed',
      registration_capacity = NULL,
      registration_deadline = clock_timestamp() - interval '1 day'
    WHERE id = ${context.tournamentId}
  `;
  await seedWaitlist(context, placementTeamIds.slice(0, 3));
  const input = { tournamentId: context.tournamentId,
    actorUserId: context.actorId, operationId: promotionOperationIds[0] };
  const promoted = await promoteNextWaitlistedTeamAtomically(
    input,
    context.database
  );
  assert.equal(promoted.teamId, placementTeamIds[1]);
  assert.deepEqual(await effectCounts(context), {
    registrations: 1, payments: 1, promotionEvents: 1,
    promoted: 1, waiting: 2,
  });
  await assertPromotionRows(context, placementTeamIds[1], 10000);
  assert.deepEqual(await promoteNextWaitlistedTeamAtomically(
    input,
    context.database
  ), {
    ...promoted, replayed: true,
  });
  await context.sql`UPDATE public.tournaments SET status = 'registration_open'
    WHERE id = ${context.tournamentId}`;
  await withdrawPromotedRegistration(context, promoted.teamId);
  assert.deepEqual(await effectCounts(context), {
    registrations: 0, payments: 0, promotionEvents: 1,
    promoted: 1, waiting: 2,
  });
}

async function verifyWaitlistResolution(context: WaitlistContext): Promise<void> {
  const { removeWaitlistEntryAtomically, withdrawWaitlistEntryAtomically } =
    await import("../../src/lib/tournaments/waitlist-operations");
  await resetWaitlistState(context);
  await seedWaitlist(context, placementTeamIds.slice(0, 2));
  const [first, second] = await context.sql<{ id: string }[]>`
    SELECT id FROM public.tournament_waitlist_entries
    WHERE tournament_id = ${context.tournamentId} ORDER BY queue_position
  `;
  const captainOnly = (error: unknown) => error instanceof Error &&
    error.message === "Only the team captain may withdraw this waitlist entry.";
  await assert.rejects(() => withdrawWaitlistEntryAtomically({
    tournamentId: context.tournamentId, teamId: placementTeamIds[0],
    actorUserId: context.actorId,
  }, context.database), captainOnly);
  await assert.rejects(() => withdrawWaitlistEntryAtomically({
    tournamentId: context.tournamentId, teamId: placementTeamIds[1],
    actorUserId: waitlistCaptainId,
  }, context.database), captainOnly);
  await assert.rejects(() => removeWaitlistEntryAtomically({
    tournamentId: context.tournamentId, waitlistEntryId: second.id,
    actorUserId: waitlistCaptainId,
  }, context.database));
  await withdrawWaitlistEntryAtomically({
    tournamentId: context.tournamentId, teamId: placementTeamIds[0],
    actorUserId: waitlistCaptainId,
  }, context.database);
  await removeWaitlistEntryAtomically({
    tournamentId: context.tournamentId, waitlistEntryId: second.id,
    actorUserId: context.actorId,
  }, context.database);
  const resolved = await context.sql`
    SELECT status, resolved_at, resolved_by_user_id,
      resolution_operation_id, registration_id
    FROM public.tournament_waitlist_entries
    WHERE id IN (${first.id}, ${second.id}) ORDER BY queue_position
  `;
  assert.deepEqual(resolved.map((row) => row.status), ["withdrawn", "removed"]);
  assert.ok(resolved.every((row) => row.resolved_at && row.resolution_operation_id));
  assert.deepEqual(resolved.map((row) => row.resolved_by_user_id),
    [waitlistCaptainId, context.actorId]);
  assert.ok(resolved.every((row) => row.registration_id == null));
  assert.equal((await effectCounts(context)).registrations, 0);
  assert.equal((await effectCounts(context)).payments, 0);
}

async function verifyPromotionRace(context: WaitlistContext): Promise<void> {
  const { promoteNextWaitlistedTeamAtomically } = await import("../../src/lib/tournaments/waitlist-operations");
  await resetWaitlistState(context);
  await seedWaitlist(context, placementTeamIds.slice(1, 3));
  const contenders = promotionOperationIds.map((operationId) => () =>
    promoteNextWaitlistedTeamAtomically({
      tournamentId: context.tournamentId, actorUserId: context.actorId,
      operationId }, context.database));
  const race = await settlePromotionsAfterObservedTournamentLock(context.sql, context.tournamentId, contenders);
  assertSingleExpectedRaceRejection(race,
    "No registration slots are available for waitlist promotion.",
    "concurrent promotion");
  assert.deepEqual(await effectCounts(context), {
    registrations: 1, payments: 1, promotionEvents: 1,
    promoted: 1, waiting: 1,
  });
}

async function verifySequentialSchoolDetachment(
  context: WaitlistContext
): Promise<void> {
  const { promoteNextWaitlistedTeamAtomically } = await import(
    "../../src/lib/tournaments/waitlist-operations"
  );
  await resetWaitlistState(context);
  await seedWaitlist(context, [placementTeamIds[1]]);
  await context.sql`UPDATE public.teams
    SET verification_status = 'pending', school_id = NULL
    WHERE id = ${placementTeamIds[1]}`;
  await assert.rejects(() => promoteNextWaitlistedTeamAtomically(
    { tournamentId: context.tournamentId, actorUserId: context.actorId,
      operationId: eligibilityOperationId }, context.database
  ));
  assert.deepEqual(await effectCounts(context), {
    registrations: 0, payments: 0, promotionEvents: 0,
    promoted: 0, waiting: 1,
  });
}

async function verifyPromotionPricing(context: WaitlistContext): Promise<void> {
  const { promoteNextWaitlistedTeamAtomically } = await import(
    "../../src/lib/tournaments/waitlist-operations"
  );
  await resetWaitlistState(context);
  await context.sql`
    UPDATE public.tournaments SET registration_capacity = 2
    WHERE id = ${context.tournamentId}
  `;
  await seedWaitlist(context, placementTeamIds.slice(1, 3));
  for (const [index, expectedAmount] of [10000, 7500].entries()) {
    const promoted = await promoteNextWaitlistedTeamAtomically({
      tournamentId: context.tournamentId,
      actorUserId: context.actorId,
      operationId: promotionOperationIds[index],
    }, context.database);
    const expectedTeamId = placementTeamIds[index + 1];
    assert.equal(promoted.teamId, expectedTeamId);
    await assertPromotionRows(context, expectedTeamId, expectedAmount);
  }
  assert.deepEqual(await effectCounts(context), {
    registrations: 2, payments: 2, promotionEvents: 2,
    promoted: 2, waiting: 0,
  });
}

async function installPromotionFailure(context: WaitlistContext): Promise<void> {
  await context.sql`
    CREATE OR REPLACE FUNCTION
      app_private.reject_waitlist_promotion_payment_for_verification()
    RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $function$
    BEGIN
      RAISE EXCEPTION 'forced waitlist promotion failure';
    END
    $function$
  `;
  await context.sql`
    REVOKE ALL ON FUNCTION
      app_private.reject_waitlist_promotion_payment_for_verification()
      FROM PUBLIC, anon, authenticated
  `;
  await context.sql`
    CREATE TRIGGER reject_waitlist_promotion_payment
    BEFORE INSERT ON public.registration_payments
    FOR EACH ROW EXECUTE FUNCTION
      app_private.reject_waitlist_promotion_payment_for_verification()
  `;
}

async function removePromotionFailure(context: WaitlistContext): Promise<void> {
  await context.sql`
    DROP TRIGGER reject_waitlist_promotion_payment
    ON public.registration_payments
  `;
  await context.sql`
    DROP FUNCTION
      app_private.reject_waitlist_promotion_payment_for_verification()
  `;
}

function isForcedPromotionFailure(error: unknown): boolean {
  let current = error;
  while (current instanceof Error) {
    if (current.message.includes("forced waitlist promotion failure")) {
      return true;
    }
    current = current.cause;
  }
  return false;
}

async function verifyPromotionRollback(context: WaitlistContext): Promise<void> {
  const { promoteNextWaitlistedTeamAtomically } = await import(
    "../../src/lib/tournaments/waitlist-operations"
  );
  await resetWaitlistState(context);
  await seedWaitlist(context, [placementTeamIds[1]]);
  await installPromotionFailure(context);
  const input = { tournamentId: context.tournamentId,
    actorUserId: context.actorId, operationId: promotionOperationIds[0] };
  await assert.rejects(
    () => promoteNextWaitlistedTeamAtomically(input, context.database),
    isForcedPromotionFailure
  );
  await removePromotionFailure(context);
  assert.deepEqual(await effectCounts(context), {
    registrations: 0, payments: 0, promotionEvents: 0,
    promoted: 0, waiting: 1,
  });
  const retried = await promoteNextWaitlistedTeamAtomically(
    input,
    context.database
  );
  assert.equal(retried.replayed, false);
  assert.deepEqual(await effectCounts(context), {
    registrations: 1, payments: 1, promotionEvents: 1,
    promoted: 1, waiting: 0,
  });
  await assertPromotionRows(context, placementTeamIds[1], 10000);
}

export async function verifyWaitlistPromotion(
  sql: DatabaseSql,
  fixture: Omit<WaitlistContext, "sql">
): Promise<void> {
  const context = { sql, ...fixture };
  await seedWaitlistActors(context);
  await verifyPromotionAuthorization(context);
  await verifyTournamentScopedReplay(context);
  await verifyPromotionPricing(context);
  await verifyPromotionRollback(context);
  await verifyPromotionAndReplay(context);
  await verifyWaitlistResolution(context);
  await verifyPromotionRace(context);
  if (context.database) await verifySequentialSchoolDetachment(context);
  await resetWaitlistState(context);
  assert.deepEqual(await effectCounts(context), {
    registrations: 0, payments: 0, promotionEvents: 0,
    promoted: 0, waiting: 0,
  });
}
