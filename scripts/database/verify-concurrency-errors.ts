import assert from "node:assert/strict";

export type CapturedOutcome =
  | { status: "fulfilled" }
  | { status: "rejected"; error: unknown };

function errorChainHasCode(error: unknown, code: string): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current);
    const candidate = current as { code?: unknown; cause?: unknown };
    if (candidate.code === code) return true;
    current = candidate.cause;
  }
  return false;
}

export function assertExpectedRejection(
  outcome: CapturedOutcome,
  expectedMessage: string,
  operation: string
): void {
  assert.equal(outcome.status, "rejected");
  if (outcome.status !== "rejected") return;
  assert.equal(
    errorChainHasCode(outcome.error, "40P01"),
    false,
    `${operation} must not be accepted as a deadlock victim`
  );
  assert.ok(outcome.error instanceof Error);
  assert.equal(outcome.error.message, expectedMessage);
}

export function assertSingleExpectedRaceRejection<T>(
  race: PromiseSettledResult<T>[],
  expectedMessage: string,
  operation: string
): void {
  const fulfilled = race.filter((result) => result.status === "fulfilled");
  const rejected = race.filter((result) => result.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assertExpectedRejection(
    { status: "rejected", error: rejected[0]!.reason },
    expectedMessage,
    operation
  );
}
