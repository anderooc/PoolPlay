import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import {
  lockPublicTournamentParentsForTeam,
  publicTournamentIdsForTeam,
  type PublicTournamentParent,
} from "@/lib/tournaments/public-cache-invalidation";

export type TeamDeletionTeam = {
  id: string;
  name: string;
  schoolId: string | null;
};

export interface TeamDeletionStore<TTransaction> {
  transaction<T>(work: (tx: TTransaction) => Promise<T>): Promise<T>;
  lockParents(
    teamId: string,
    knownIds: Iterable<string>,
    tx: TTransaction
  ): Promise<PublicTournamentParent[]>;
  loadTeamForUpdate(
    teamId: string,
    tx: TTransaction
  ): Promise<TeamDeletionTeam | null>;
  currentParentIds(teamId: string, tx: TTransaction): Promise<string[]>;
  deleteTeam(teamId: string, tx: TTransaction): Promise<void>;
}

export type TeamDeletionInput<TTransaction> = {
  teamId: string;
  confirmationName: string;
  authorize: (
    tx: TTransaction,
    team: TeamDeletionTeam
  ) => Promise<string | null>;
  afterCommit: (parents: PublicTournamentParent[]) => Promise<void>;
};

type TeamDeletionAttempt =
  | { ok: true; parents: PublicTournamentParent[] }
  | { ok: false; error: string }
  | { ok: false; retryIds: string[] };

const drizzleTeamDeletionStore: TeamDeletionStore<typeof db> = {
  transaction<T>(work: (tx: typeof db) => Promise<T>): Promise<T> {
    return db.transaction((rawTx) => work(rawTx as unknown as typeof db));
  },
  lockParents(teamId, knownIds, tx) {
    return lockPublicTournamentParentsForTeam(teamId, knownIds, tx);
  },
  async loadTeamForUpdate(teamId, tx) {
    const [team] = await tx.select({
      id: teams.id,
      name: teams.name,
      schoolId: teams.schoolId,
    }).from(teams).where(eq(teams.id, teamId)).for("update").limit(1);
    return team ?? null;
  },
  currentParentIds(teamId, tx) {
    return publicTournamentIdsForTeam(teamId, tx);
  },
  async deleteTeam(teamId, tx) {
    await tx.delete(teams).where(eq(teams.id, teamId));
  },
};

async function attemptTeamDeletion<TTransaction>(
  input: TeamDeletionInput<TTransaction>,
  knownTournamentIds: string[],
  store: TeamDeletionStore<TTransaction>
): Promise<TeamDeletionAttempt> {
  return store.transaction(async (tx) => {
    const parents = await store.lockParents(
      input.teamId,
      knownTournamentIds,
      tx
    );
    const team = await store.loadTeamForUpdate(input.teamId, tx);
    if (!team) return { ok: false as const, error: "Team not found" };
    if (team.name.trim() !== input.confirmationName.trim()) {
      return { ok: false as const, error:
        "Team name does not match — type it exactly as shown (including spaces)." };
    }
    const authorizationError = await input.authorize(tx, team);
    if (authorizationError) {
      return { ok: false as const, error: authorizationError };
    }
    const currentIds = await store.currentParentIds(input.teamId, tx);
    const lockedIds = new Set(parents.map((parent) => parent.id));
    const missingIds = currentIds.filter((id) => !lockedIds.has(id));
    if (missingIds.length > 0) {
      return { ok: false as const, retryIds: [...lockedIds, ...missingIds] };
    }
    await store.deleteTeam(input.teamId, tx);
    return { ok: true as const, parents };
  });
}

export async function deleteTeamWithTournamentLocks<TTransaction = typeof db>(
  input: TeamDeletionInput<TTransaction>,
  store: TeamDeletionStore<TTransaction> =
    drizzleTeamDeletionStore as unknown as TeamDeletionStore<TTransaction>
): Promise<{ ok: true } | { ok: false; error: string }> {
  let knownTournamentIds: string[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await attemptTeamDeletion(input, knownTournamentIds, store);
    if ("retryIds" in result) {
      knownTournamentIds = [...new Set(result.retryIds)].sort();
      continue;
    }
    if (!result.ok) return result;
    await input.afterCommit(result.parents);
    return { ok: true };
  }
  return { ok: false, error: "Team activity changed. Try again." };
}
