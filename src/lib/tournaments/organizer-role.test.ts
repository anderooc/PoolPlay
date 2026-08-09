import assert from "node:assert/strict";
import test from "node:test";
import type { UserRole } from "@/types";
import * as permissions from "@/lib/tournaments/permissions";

type TournamentCreatorRoleUpdate = (role: UserRole) => UserRole | null;

const tournamentCreatorRoleUpdate = (
  permissions as typeof permissions & {
    tournamentCreatorRoleUpdate?: TournamentCreatorRoleUpdate;
  }
).tournamentCreatorRoleUpdate;
const tournamentCreatorPromotableRoles = (
  permissions as typeof permissions & {
    tournamentCreatorPromotableRoles?: readonly UserRole[];
  }
).tournamentCreatorPromotableRoles;

test("tournament creation preserves the global admin role", () => {
  assert.equal(typeof tournamentCreatorRoleUpdate, "function");
  assert.equal(tournamentCreatorRoleUpdate!("admin"), null);
});

test("tournament creation promotes only non-organizer participant roles", () => {
  assert.equal(typeof tournamentCreatorRoleUpdate, "function");
  assert.equal(tournamentCreatorRoleUpdate!("player"), "organizer");
  assert.equal(tournamentCreatorRoleUpdate!("captain"), "organizer");
  assert.equal(tournamentCreatorRoleUpdate!("organizer"), null);
});

test("the database update predicate targets only promotable current roles", () => {
  assert.deepEqual(tournamentCreatorPromotableRoles, ["player", "captain"]);
});
