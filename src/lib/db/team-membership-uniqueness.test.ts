import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { teamMembers } from "@/lib/db/schema";

test("one user can belong to a team only once", () => {
  const index = getTableConfig(teamMembers).indexes.find(
    ({ config }) => config.name === "team_members_team_user_unique"
  );

  assert.ok(index, "team membership requires a database unique index");
  assert.equal(index.config.unique, true);
  const columnNames = index.config.columns.map((column) =>
    "name" in column ? column.name : null
  );
  assert.deepEqual(
    columnNames,
    ["team_id", "user_id"]
  );
});
