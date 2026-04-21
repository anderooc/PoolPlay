import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "player",
  "captain",
  "organizer",
]);

export const tournamentStatusEnum = pgEnum("tournament_status", [
  "draft",
  "registration_open",
  "registration_closed",
  "in_progress",
  "completed",
]);

export const registrationStatusEnum = pgEnum("registration_status", [
  "pending",
  "confirmed",
  "checked_in",
]);

export const divisionFormatEnum = pgEnum("division_format", [
  "pool_to_bracket",
  "single_elimination",
  "double_elimination",
]);

export const bracketTypeEnum = pgEnum("bracket_type", [
  "single_elimination",
  "double_elimination",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "upcoming",
  "in_progress",
  "completed",
]);

export const teamMemberRoleEnum = pgEnum("team_member_role", [
  "captain",
  "player",
]);

// ── Tables ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authId: text("auth_id").unique().notNull(),
  email: text("email").unique().notNull(),
  fullName: text("full_name").notNull(),
  university: text("university"),
  role: userRoleEnum("role").default("player").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  university: text("university").notNull(),
  season: text("season"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: teamMemberRoleEnum("role").default("player").notNull(),
  jerseyNumber: integer("jersey_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournaments = pgTable("tournaments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizerId: uuid("organizer_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  location: text("location").notNull(),
  address: text("address"),
  status: tournamentStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const divisions = pgTable("divisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  format: divisionFormatEnum("format").default("pool_to_bracket").notNull(),
  teamCap: integer("team_cap"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const registrations = pgTable("registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  tournamentId: uuid("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  /** Set by tournament organizer when placing teams into divisions / pools */
  divisionId: uuid("division_id").references(() => divisions.id, {
    onDelete: "cascade",
  }),
  status: registrationStatusEnum("status").default("pending").notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const pools = pgTable("pools", {
  id: uuid("id").primaryKey().defaultRandom(),
  divisionId: uuid("division_id")
    .references(() => divisions.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const poolTeams = pgTable("pool_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  poolId: uuid("pool_id")
    .references(() => pools.id, { onDelete: "cascade" })
    .notNull(),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  seed: integer("seed"),
});

export const brackets = pgTable("brackets", {
  id: uuid("id").primaryKey().defaultRandom(),
  divisionId: uuid("division_id")
    .references(() => divisions.id, { onDelete: "cascade" })
    .notNull(),
  bracketType: bracketTypeEnum("bracket_type")
    .default("single_elimination")
    .notNull(),
  seedCount: integer("seed_count").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courts = pgTable("courts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
});

/** Many-to-many: a court may serve multiple divisions; courts with no rows here are shared for scheduling */
export const courtDivisions = pgTable(
  "court_divisions",
  {
    courtId: uuid("court_id")
      .references(() => courts.id, { onDelete: "cascade" })
      .notNull(),
    divisionId: uuid("division_id")
      .references(() => divisions.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.courtId, t.divisionId] })]
);

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  poolId: uuid("pool_id").references(() => pools.id, { onDelete: "set null" }),
  bracketId: uuid("bracket_id").references(() => brackets.id, {
    onDelete: "set null",
  }),
  courtId: uuid("court_id").references(() => courts.id, {
    onDelete: "set null",
  }),
  teamAId: uuid("team_a_id").references(() => teams.id),
  teamBId: uuid("team_b_id").references(() => teams.id),
  bracketRound: integer("bracket_round"),
  bracketPosition: integer("bracket_position"),
  scheduledTime: timestamp("scheduled_time"),
  status: matchStatusEnum("status").default("upcoming").notNull(),
  winnerId: uuid("winner_id").references(() => teams.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sets = pgTable("sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .references(() => matches.id, { onDelete: "cascade" })
    .notNull(),
  setNumber: integer("set_number").notNull(),
  teamAScore: integer("team_a_score").default(0).notNull(),
  teamBScore: integer("team_b_score").default(0).notNull(),
});

// ── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  organizedTournaments: many(tournaments),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
  registrations: many(registrations),
  poolTeams: many(poolTeams),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  organizer: one(users, {
    fields: [tournaments.organizerId],
    references: [users.id],
  }),
  divisions: many(divisions),
  registrations: many(registrations),
  courts: many(courts),
}));

export const divisionsRelations = relations(divisions, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [divisions.tournamentId],
    references: [tournaments.id],
  }),
  registrations: many(registrations),
  pools: many(pools),
  brackets: many(brackets),
  courtDivisions: many(courtDivisions),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  team: one(teams, {
    fields: [registrations.teamId],
    references: [teams.id],
  }),
  tournament: one(tournaments, {
    fields: [registrations.tournamentId],
    references: [tournaments.id],
  }),
  division: one(divisions, {
    fields: [registrations.divisionId],
    references: [divisions.id],
  }),
}));

export const poolsRelations = relations(pools, ({ one, many }) => ({
  division: one(divisions, {
    fields: [pools.divisionId],
    references: [divisions.id],
  }),
  poolTeams: many(poolTeams),
  matches: many(matches),
}));

export const poolTeamsRelations = relations(poolTeams, ({ one }) => ({
  pool: one(pools, { fields: [poolTeams.poolId], references: [pools.id] }),
  team: one(teams, { fields: [poolTeams.teamId], references: [teams.id] }),
}));

export const bracketsRelations = relations(brackets, ({ one, many }) => ({
  division: one(divisions, {
    fields: [brackets.divisionId],
    references: [divisions.id],
  }),
  matches: many(matches),
}));

export const courtsRelations = relations(courts, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [courts.tournamentId],
    references: [tournaments.id],
  }),
  courtDivisions: many(courtDivisions),
  matches: many(matches),
}));

export const courtDivisionsRelations = relations(courtDivisions, ({ one }) => ({
  court: one(courts, {
    fields: [courtDivisions.courtId],
    references: [courts.id],
  }),
  division: one(divisions, {
    fields: [courtDivisions.divisionId],
    references: [divisions.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  pool: one(pools, { fields: [matches.poolId], references: [pools.id] }),
  bracket: one(brackets, {
    fields: [matches.bracketId],
    references: [brackets.id],
  }),
  court: one(courts, { fields: [matches.courtId], references: [courts.id] }),
  teamA: one(teams, {
    fields: [matches.teamAId],
    references: [teams.id],
    relationName: "teamA",
  }),
  teamB: one(teams, {
    fields: [matches.teamBId],
    references: [teams.id],
    relationName: "teamB",
  }),
  winner: one(teams, {
    fields: [matches.winnerId],
    references: [teams.id],
    relationName: "winner",
  }),
  sets: many(sets),
}));

export const setsRelations = relations(sets, ({ one }) => ({
  match: one(matches, { fields: [sets.matchId], references: [matches.id] }),
}));
