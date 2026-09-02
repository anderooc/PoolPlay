/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import { and, eq, inArray } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  divisions,
  registrations,
  schools,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";
import { getPaymentsByRegistrationIds } from "@/lib/tournaments/payment-compliance";
import { paymentMethodLabel, paymentStatusLabel } from "@/lib/tournaments/payment-settings";
import { canEditRegistrations } from "@/lib/tournaments/permissions";
import { requireHostTournament } from "./tournament-host";

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map(csvEscape).join(",");
}

export async function buildTournamentRegistrationsCsv(
  slug: string,
  user: AppUser
): Promise<{ filename: string; body: string } | { error: string }> {
  const tournament = await requireHostTournament(slug, user);
  const canManage = await canEditRegistrations(tournament, user);
  if (!canManage) return { error: "Not authorized to export registrations." };

  const rows = await db
    .select({
      id: registrations.id,
      status: registrations.status,
      registeredAt: registrations.registeredAt,
      teamName: teams.name,
      schoolName: schools.name,
      divisionName: divisions.name,
      teamId: teams.id,
    })
    .from(registrations)
    .innerJoin(teams, eq(registrations.teamId, teams.id))
    .leftJoin(schools, eq(teams.schoolId, schools.id))
    .leftJoin(divisions, eq(registrations.divisionId, divisions.id))
    .where(eq(registrations.tournamentId, tournament.id))
    .orderBy(registrations.registeredAt);

  const paymentMap =
    rows.length > 0
      ? await getPaymentsByRegistrationIds(rows.map((row) => row.id))
      : new Map();

  const teamIds = rows.map((row) => row.teamId);
  const captainRows =
    teamIds.length > 0
      ? await db
          .select({
            teamId: teamMembers.teamId,
            email: users.email,
            fullName: users.fullName,
          })
          .from(teamMembers)
          .innerJoin(users, eq(teamMembers.userId, users.id))
          .where(
            and(
              eq(teamMembers.role, "captain"),
              inArray(teamMembers.teamId, teamIds)
            )
          )
      : [];

  const captainByTeam = new Map(
    captainRows.map((row) => [row.teamId, row])
  );

  const header = csvRow([
    "team_name",
    "school_name",
    "division",
    "status",
    "registered_at",
    "captain_name",
    "captain_email",
    "payment_status",
    "payment_amount_cents",
    "payment_method",
    "payment_note",
  ]);

  const lines = rows.map((row) => {
    const payment = paymentMap.get(row.id);
    const captain = captainByTeam.get(row.teamId);
    return csvRow([
      row.teamName,
      row.schoolName,
      row.divisionName,
      row.status,
      row.registeredAt.toISOString(),
      captain?.fullName ?? null,
      captain?.email ?? null,
      payment ? paymentStatusLabel(payment.status) : null,
      payment?.amountCents ?? null,
      payment?.submittedMethod
        ? paymentMethodLabel(payment.submittedMethod)
        : null,
      payment?.submittedNote ?? null,
    ]);
  });

  return {
    filename: `${tournament.slug}-registrations.csv`,
    body: [header, ...lines].join("\n"),
  };
}
