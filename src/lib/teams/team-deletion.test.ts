import assert from "node:assert/strict";
import { it } from "node:test";
import {
  deleteTeamWithTournamentLocks,
  type TeamDeletionStore,
  type TeamDeletionTeam,
} from "@/lib/teams/team-deletion";

type FakeTransaction = { attempt: number };

const team: TeamDeletionTeam = {
  id: "team-1",
  name: "Team One",
  schoolId: null,
};

function parent(id: string) {
  return { id, slug: `tournament-${id}` };
}

  it("retries when a parent appears before the team lock", async () => {
    const events: string[] = [];
    let attempt = 0;
    const store: TeamDeletionStore<FakeTransaction> = {
      async transaction(work) {
        const tx = { attempt: ++attempt };
        events.push(`tx${tx.attempt}:start`);
        const result = await work(tx);
        events.push(`tx${tx.attempt}:commit`);
        return result;
      },
      async lockParents(_teamId, knownIds, tx) {
        events.push(`tx${tx.attempt}:lock:${[...knownIds].join(",")}`);
        return tx.attempt === 1 ? [parent("a")] : [parent("a"), parent("b")];
      },
      async loadTeamForUpdate() { return team; },
      async currentParentIds(_teamId, tx) {
        return tx.attempt === 1 ? ["a", "b"] : ["a", "b"];
      },
      async deleteTeam(_teamId, tx) { events.push(`tx${tx.attempt}:delete`); },
    };
    const result = await deleteTeamWithTournamentLocks({
      teamId: team.id,
      confirmationName: team.name,
      authorize: async () => null,
      afterCommit: async (parents) => {
        events.push(`invalidate:${parents.map((row) => row.id).join(",")}`);
      },
    }, store);
    assert.deepEqual(result, { ok: true });
    assert.equal(attempt, 2);
    assert.deepEqual(events.filter((event) => event.includes(":delete")), [
      "tx2:delete",
    ]);
    assert.ok(events.indexOf("tx2:commit") < events.indexOf("invalidate:a,b"));
  });

  it("fails after live authorization is revoked", async () => {
    let deleted = false;
    let invalidated = false;
    const store: TeamDeletionStore<FakeTransaction> = {
      async transaction(work) { return work({ attempt: 1 }); },
      async lockParents() { return [parent("a")]; },
      async loadTeamForUpdate() { return team; },
      async currentParentIds() { return ["a"]; },
      async deleteTeam() { deleted = true; },
    };
    const result = await deleteTeamWithTournamentLocks({
      teamId: team.id,
      confirmationName: team.name,
      authorize: async () => "Authorization was revoked",
      afterCommit: async () => { invalidated = true; },
    }, store);
    assert.deepEqual(result, { ok: false, error: "Authorization was revoked" });
    assert.equal(deleted, false);
    assert.equal(invalidated, false);
  });

  it("fails closed after three unstable parent sets", async () => {
    let attempt = 0;
    let deleted = false;
    let invalidated = false;
    const store: TeamDeletionStore<FakeTransaction> = {
      async transaction(work) { return work({ attempt: ++attempt }); },
      async lockParents(_teamId, knownIds) {
        return [...knownIds].map(parent);
      },
      async loadTeamForUpdate() { return team; },
      async currentParentIds(_teamId, tx) {
        return Array.from({ length: tx.attempt }, (_, index) => `${index + 1}`);
      },
      async deleteTeam() { deleted = true; },
    };
    const result = await deleteTeamWithTournamentLocks({
      teamId: team.id,
      confirmationName: team.name,
      authorize: async () => null,
      afterCommit: async () => { invalidated = true; },
    }, store);
    assert.deepEqual(result, {
      ok: false,
      error: "Team activity changed. Try again.",
    });
    assert.equal(attempt, 3);
    assert.equal(deleted, false);
    assert.equal(invalidated, false);
  });
