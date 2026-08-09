import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  tournamentWaitlistEntries,
  tournaments,
} from "@/lib/db/schema";

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

function indexColumnName(column: unknown): string {
  if (
    typeof column === "object" &&
    column !== null &&
    "name" in column &&
    typeof column.name === "string"
  ) {
    return column.name;
  }
  throw new Error("Waitlist indexes must reference table columns.");
}

test("tournaments expose optional capacity and a timezone-aware deadline", () => {
  const config = getTableConfig(tournaments);
  const capacity = config.columns.find(
    (column) => column.name === "registration_capacity"
  );
  const deadline = config.columns.find(
    (column) => column.name === "registration_deadline"
  );

  assert.ok(capacity);
  assert.equal(capacity.notNull, false);
  assert.ok(deadline);
  assert.equal(deadline.notNull, false);
  assert.equal(deadline.getSQLType(), "timestamp with time zone");
});

test("waitlist entries expose durable queue and resolution metadata", () => {
  const config = getTableConfig(tournamentWaitlistEntries);
  const columns = config.columns.map((column) => ({
    name: column.name,
    sqlType: column.getSQLType(),
    notNull: column.notNull,
    hasDefault: column.hasDefault,
  }));

  assert.deepEqual(
    columns.filter((column) =>
      [
        "queue_position",
        "request_operation_id",
        "status",
        "requested_at",
        "resolved_at",
        "resolved_by_user_id",
        "resolution_operation_id",
        "registration_id",
      ].includes(column.name)
    ),
    [
      {
        name: "queue_position",
        sqlType: "bigserial",
        notNull: true,
        hasDefault: true,
      },
      {
        name: "request_operation_id",
        sqlType: "uuid",
        notNull: true,
        hasDefault: false,
      },
      {
        name: "status",
        sqlType: "waitlist_entry_status",
        notNull: true,
        hasDefault: true,
      },
      {
        name: "requested_at",
        sqlType: "timestamp with time zone",
        notNull: true,
        hasDefault: true,
      },
      {
        name: "resolved_at",
        sqlType: "timestamp with time zone",
        notNull: false,
        hasDefault: false,
      },
      {
        name: "resolved_by_user_id",
        sqlType: "uuid",
        notNull: false,
        hasDefault: false,
      },
      {
        name: "resolution_operation_id",
        sqlType: "uuid",
        notNull: false,
        hasDefault: false,
      },
      {
        name: "registration_id",
        sqlType: "uuid",
        notNull: false,
        hasDefault: false,
      },
    ]
  );
});

test("waitlist partial indexes target their queue states and keys", () => {
  const config = getTableConfig(tournamentWaitlistEntries);
  const indexMetadata = config.indexes.map(({ config }) => ({
    name: config.name ?? "",
    unique: config.unique,
    columns: config.columns.map(indexColumnName),
    where: sqlMetadataText(config.where),
  }));

  assert.deepEqual(
    indexMetadata.filter((index) =>
      [
        "tournament_waitlist_entries_waiting_team_unique",
        "tournament_waitlist_entries_fifo_idx",
        "tournament_waitlist_entries_request_operation_unique",
        "tournament_waitlist_entries_resolution_operation_unique",
        "tournament_waitlist_entries_registration_unique",
      ].includes(index.name)
    ),
    [
      {
        name: "tournament_waitlist_entries_waiting_team_unique",
        unique: true,
        columns: ["tournament_id", "team_id"],
        where: "status = 'waiting'",
      },
      {
        name: "tournament_waitlist_entries_fifo_idx",
        unique: false,
        columns: ["tournament_id", "queue_position"],
        where: "status = 'waiting'",
      },
      {
        name: "tournament_waitlist_entries_request_operation_unique",
        unique: true,
        columns: ["tournament_id", "team_id", "request_operation_id"],
        where: "",
      },
      {
        name: "tournament_waitlist_entries_resolution_operation_unique",
        unique: true,
        columns: ["tournament_id", "resolution_operation_id"],
        where: "resolution_operation_id IS NOT NULL",
      },
      {
        name: "tournament_waitlist_entries_registration_unique",
        unique: true,
        columns: ["registration_id"],
        where: "registration_id IS NOT NULL",
      },
    ]
  );
});

test("waiting rows have no resolver metadata and promoted history survives registration deletion", () => {
  const config = getTableConfig(tournamentWaitlistEntries);
  const consistencyCheck = config.checks.find(
    (check) => check.name === "tournament_waitlist_entries_resolution_consistent"
  );

  assert.ok(consistencyCheck);
  const checkSql = sqlMetadataText(consistencyCheck.value).replace(
    /\s+/g,
    " "
  );
  assert.match(
    checkSql,
    /status = 'waiting' AND resolved_at IS NULL AND resolved_by_user_id IS NULL AND resolution_operation_id IS NULL AND registration_id IS NULL/
  );
  const promotedClause = checkSql.match(
    /status = 'promoted'([\s\S]*?)OR \(/
  );
  assert.ok(promotedClause);
  assert.match(
    promotedClause[0],
    /resolved_at IS NOT NULL AND resolution_operation_id IS NOT NULL/
  );
  assert.doesNotMatch(promotedClause[0], /registration_id IS NOT NULL/);
});
