import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { teamMembers, users } from "@/lib/db/schema";

function sqlMetadataText(chunk: unknown): string {
  if (chunk === null || chunk === undefined) {
    return "";
  }
  if (typeof chunk === "string") {
    return chunk;
  }
  if (
    typeof chunk === "object" &&
    "name" in chunk &&
    typeof chunk.name === "string"
  ) {
    return chunk.name;
  }
  if (
    typeof chunk === "object" &&
    "value" in chunk &&
    Array.isArray(chunk.value)
  ) {
    return chunk.value.map(sqlMetadataText).join("");
  }
  if (
    typeof chunk === "object" &&
    "queryChunks" in chunk &&
    Array.isArray(chunk.queryChunks)
  ) {
    return chunk.queryChunks.map(sqlMetadataText).join("");
  }
  return "";
}

test("users store a preferred jersey number from 0–99", () => {
  const config = getTableConfig(users);
  const column = config.columns.find((item) => item.name === "jersey_number");
  assert.ok(column, "users.jersey_number must exist");
  assert.equal(column.notNull, false);
  assert.equal(column.getSQLType(), "integer");

  const check = config.checks.find(
    (item) => item.name === "users_jersey_number_range"
  );
  assert.ok(check, "users.jersey_number requires a 0–99 check");
  assert.match(
    sqlMetadataText(check.value).replace(/\s+/g, " "),
    /jersey_number IS NULL OR \(jersey_number >= 0 AND jersey_number <= 99\)/
  );
});

test("a team roster cannot reuse a jersey number", () => {
  const config = getTableConfig(teamMembers);
  const index = config.indexes.find(
    ({ config: item }) => item.name === "team_members_team_jersey_unique"
  );

  assert.ok(index, "team jerseys require a database unique index");
  assert.equal(index.config.unique, true);
  const columnNames = index.config.columns.map((column) =>
    "name" in column ? column.name : null
  );
  assert.deepEqual(columnNames, ["team_id", "jersey_number"]);
  assert.match(
    sqlMetadataText(index.config.where),
    /jersey_number\s+IS\s+NOT\s+NULL/i
  );

  const check = config.checks.find(
    (item) => item.name === "team_members_jersey_number_range"
  );
  assert.ok(check, "team_members.jersey_number requires a 0–99 check");
});
