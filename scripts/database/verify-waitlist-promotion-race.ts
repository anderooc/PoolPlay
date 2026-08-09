import type postgres from "postgres";
import { waitForLockWait } from "./verify-registration-school-deletion-race";

type DatabaseSql = postgres.Sql;

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

export async function settlePromotionsAfterObservedTournamentLock<T>(
  sql: DatabaseSql,
  tournamentId: string,
  contenderFactories: Array<() => Promise<T>>
): Promise<PromiseSettledResult<T>[]> {
  const lockStarted = deferred();
  const releaseLock = deferred();
  const heldLock = sql.begin(async (transaction) => {
    await transaction`SELECT id FROM public.tournaments
      WHERE id = ${tournamentId} FOR UPDATE`;
    lockStarted.resolve();
    await releaseLock.promise;
  });
  await lockStarted.promise;
  const contenders = contenderFactories.map((start) => start());
  let barrierError: unknown;
  try {
    await waitForLockWait(
      sql, "tournaments", "FOR UPDATE", contenders.length
    );
  } catch (error) {
    barrierError = error;
  } finally {
    releaseLock.resolve();
  }
  await heldLock;
  const results = await Promise.allSettled(contenders);
  if (barrierError) throw barrierError;
  return results;
}
