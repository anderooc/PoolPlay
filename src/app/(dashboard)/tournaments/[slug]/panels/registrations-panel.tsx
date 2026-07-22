/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { InferSelectModel } from "drizzle-orm";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  divisions,
  registrations,
  schools,
  teamMembers,
  teams,
  tournaments,
} from "@/lib/db/schema";
import {
  canCheckInRegistrations,
  canEditRegistrations,
  canRegisterTeams,
  resolveIsTournamentOrganizer,
  type UserForPermissions,
} from "@/lib/tournaments/permissions";
import { getTeamsWaiverSummary } from "@/lib/tournaments/waiver-compliance";
import { getPaymentsByRegistrationIds } from "@/lib/tournaments/payment-compliance";
import { RegistrationList } from "../registration-list";

export async function TournamentRegistrationsPanel({
  tournament,
  user,
  listKind,
}: {
  tournament: InferSelectModel<typeof tournaments>;
  user: UserForPermissions;
  listKind: "teams" | "pending";
}) {
  const isOrganizer = await resolveIsTournamentOrganizer(tournament, user);
  const canManageRegistrations =
    isOrganizer && await canEditRegistrations(tournament, user);
  const canCheckIn =
    isOrganizer && await canCheckInRegistrations(tournament, user);

  const [tournamentRegistrations, memberRows, divisionOptions] =
    await Promise.all([
      db
        .select({
          id: registrations.id,
          status: registrations.status,
          registeredAt: registrations.registeredAt,
          teamId: teams.id,
          teamName: teams.name,
          teamUniversity: teams.university,
          schoolId: teams.schoolId,
          schoolName: schools.name,
          divisionId: divisions.id,
          divisionName: divisions.name,
        })
        .from(registrations)
        .innerJoin(teams, eq(registrations.teamId, teams.id))
        .leftJoin(schools, eq(teams.schoolId, schools.id))
        .leftJoin(divisions, eq(registrations.divisionId, divisions.id))
        .where(eq(registrations.tournamentId, tournament.id))
        .orderBy(asc(registrations.registeredAt), asc(teams.name)),
      db
        .select({ teamId: teamMembers.teamId, role: teamMembers.role })
        .from(teamMembers)
        .where(eq(teamMembers.userId, user.id)),
      db
        .select({ id: divisions.id, name: divisions.name })
        .from(divisions)
        .where(eq(divisions.tournamentId, tournament.id))
        .orderBy(asc(divisions.name), asc(divisions.id)),
    ]);

  const myTeamIds = new Set(memberRows.map((r) => r.teamId));
  const captainIds = new Set(
    memberRows.filter((r) => r.role === "captain").map((r) => r.teamId)
  );

  const rows =
    listKind === "teams"
      ? tournamentRegistrations.filter(
          (r) => r.status === "confirmed" || r.status === "checked_in"
        )
      : isOrganizer
        ? tournamentRegistrations.filter((r) => r.status === "pending")
        : tournamentRegistrations.filter(
            (r) => r.status === "pending" && myTeamIds.has(r.teamId)
          );

  const waiverSummary =
    listKind === "teams" && tournament.waiverEnabled
      ? await getTeamsWaiverSummary(
          tournament,
          rows.map((row) => row.teamId)
        )
      : new Map();

  const paymentSummary =
    tournament.paymentEnabled && rows.length > 0
      ? await getPaymentsByRegistrationIds(rows.map((row) => row.id))
      : new Map();

  return (
    <div className="space-y-3">
      {listKind === "teams" && canManageRegistrations && (
        <p className="text-sm text-muted-foreground">
          Assign confirmed teams to pools before generating matches.
        </p>
      )}
      {listKind === "pending" &&
        isOrganizer &&
        canManageRegistrations &&
        rows.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Review and confirm registrations before assigning pools.
          </p>
        )}
      {listKind === "pending" && !isOrganizer && (
        <p className="text-sm text-muted-foreground">
          Track your team&apos;s registration status for this tournament.
        </p>
      )}
      <RegistrationList
        tournamentId={tournament.id}
        tournamentSlug={tournament.slug}
        registrations={rows}
        divisions={divisionOptions}
        listKind={listKind}
        applicantView={listKind === "pending" && !isOrganizer}
        canManageRegistrations={canManageRegistrations}
        canCheckIn={canCheckIn}
        canWithdraw={canRegisterTeams(tournament)}
        captainTeamIds={captainIds}
        waiverSummary={waiverSummary}
        showWaiverStatus={listKind === "teams" && tournament.waiverEnabled}
        paymentSummary={paymentSummary}
        showPaymentStatus={tournament.paymentEnabled}
      />
    </div>
  );
}
