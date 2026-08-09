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
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  divisions,
  registrations,
  schools,
  teamMembers,
  teams,
  tournamentWaitlistEntries,
  tournaments,
} from "@/lib/db/schema";
import {
  canCheckInRegistrations,
  canEditRegistrations,
  canRegisterTeams,
  resolveIsTournamentOrganizer,
  teamMatchesTournamentGender,
  type UserForPermissions,
} from "@/lib/tournaments/permissions";
import { teamRegistrationBlockReason } from "@/lib/tournaments/registration-eligibility";
import { withTournamentQueueRanks } from "@/lib/tournaments/waitlist-rank";
import { getTeamsWaiverSummary } from "@/lib/tournaments/waiver-compliance";
import { getPaymentsByRegistrationIds } from "@/lib/tournaments/payment-compliance";
import { RegistrationList } from "../registration-list";
import {
  WaitlistControls,
  type OrganizerWaitlistRow,
} from "../waitlist-controls";

type Tournament = InferSelectModel<typeof tournaments>;
type ListKind = "teams" | "pending";

async function loadTournamentRegistrations(tournamentId: string) {
  return db
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
    .where(eq(registrations.tournamentId, tournamentId))
    .orderBy(asc(registrations.registeredAt), asc(teams.name));
}

async function loadMemberRows(userId: string) {
  return db
    .select({ teamId: teamMembers.teamId, role: teamMembers.role })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));
}

async function loadDivisionOptions(tournamentId: string) {
  return db
    .select({ id: divisions.id, name: divisions.name })
    .from(divisions)
    .where(eq(divisions.tournamentId, tournamentId))
    .orderBy(asc(divisions.name), asc(divisions.id));
}

async function loadOrganizerWaitlist(
  tournamentId: string,
  organizerAuthorized: boolean
) {
  if (!organizerAuthorized) return [];
  return db
    .select({
      id: tournamentWaitlistEntries.id,
      position: tournamentWaitlistEntries.queuePosition,
      requestedAt: tournamentWaitlistEntries.requestedAt,
      teamId: teams.id,
      teamName: teams.name,
      teamUniversity: teams.university,
      teamGender: teams.gender,
      teamStatus: teams.verificationStatus,
      schoolId: teams.schoolId,
      schoolName: schools.name,
      schoolStatus: schools.verificationStatus,
    })
    .from(tournamentWaitlistEntries)
    .innerJoin(teams, eq(tournamentWaitlistEntries.teamId, teams.id))
    .leftJoin(schools, eq(teams.schoolId, schools.id))
    .where(
      and(
        eq(tournamentWaitlistEntries.tournamentId, tournamentId),
        eq(tournamentWaitlistEntries.status, "waiting")
      )
    )
    .orderBy(asc(tournamentWaitlistEntries.queuePosition));
}

type RegistrationRow = Awaited<
  ReturnType<typeof loadTournamentRegistrations>
>[number];
type WaitingRow = Awaited<ReturnType<typeof loadOrganizerWaitlist>>[number];

function visibleRegistrationRows(
  rows: RegistrationRow[],
  listKind: ListKind,
  isOrganizer: boolean,
  myTeamIds: Set<string>
): RegistrationRow[] {
  if (listKind === "teams") {
    return rows.filter(
      (row) => row.status === "confirmed" || row.status === "checked_in"
    );
  }
  if (isOrganizer) return rows.filter((row) => row.status === "pending");
  return rows.filter(
    (row) => row.status === "pending" && myTeamIds.has(row.teamId)
  );
}

function membershipSets(memberRows: Awaited<ReturnType<typeof loadMemberRows>>) {
  return {
    myTeamIds: new Set(memberRows.map((row) => row.teamId)),
    captainIds: new Set(
      memberRows.filter((row) => row.role === "captain").map((row) => row.teamId)
    ),
  };
}

function organizerWaitlistRows(
  waitingRows: WaitingRow[],
  registrationRows: RegistrationRow[],
  tournamentGender: Tournament["gender"]
): OrganizerWaitlistRow[] {
  const registeredTeamIds = new Set(registrationRows.map((row) => row.teamId));
  return withTournamentQueueRanks(waitingRows).map((row) => ({
    id: row.id,
    queueRank: row.queueRank,
    teamName: row.teamName,
    schoolName: row.schoolName ?? row.teamUniversity ?? "Independent team",
    requestedAt: row.requestedAt.toISOString(),
    eligible:
      !registeredTeamIds.has(row.teamId) &&
      teamRegistrationBlockReason(
        row.schoolId,
        row.schoolStatus,
        row.teamStatus
      ) == null &&
      teamMatchesTournamentGender(row.teamGender, tournamentGender),
  }));
}

async function loadCompliance(
  tournament: Tournament,
  listKind: ListKind,
  rows: RegistrationRow[]
) {
  return Promise.all([
    listKind === "teams" && tournament.waiverEnabled
      ? getTeamsWaiverSummary(tournament, rows.map((row) => row.teamId))
      : Promise.resolve(new Map()),
    tournament.paymentEnabled && rows.length > 0
      ? getPaymentsByRegistrationIds(rows.map((row) => row.id))
      : Promise.resolve(new Map()),
  ]);
}

function RegistrationPanelDescription({
  listKind,
  isOrganizer,
  canManage,
  hasRows,
}: {
  listKind: ListKind;
  isOrganizer: boolean;
  canManage: boolean;
  hasRows: boolean;
}) {
  if (listKind === "teams" && canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Assign confirmed teams to pools before generating matches.
      </p>
    );
  }
  if (listKind === "pending" && isOrganizer && canManage && hasRows) {
    return (
      <p className="text-sm text-muted-foreground">
        Review and confirm registrations before assigning pools.
      </p>
    );
  }
  if (listKind === "pending" && !isOrganizer) {
    return (
      <p className="text-sm text-muted-foreground">
        Track your team&apos;s registration status for this tournament.
      </p>
    );
  }
  return null;
}

type Compliance = Awaited<ReturnType<typeof loadCompliance>>;
type DivisionOption = Awaited<ReturnType<typeof loadDivisionOptions>>[number];

type RegistrationPanelContentProps = {
  tournament: Tournament;
  listKind: ListKind;
  isOrganizer: boolean;
  canManage: boolean;
  canCheckIn: boolean;
  rows: RegistrationRow[];
  divisions: DivisionOption[];
  captainIds: Set<string>;
  waiverSummary: Compliance[0];
  paymentSummary: Compliance[1];
  waitlistRows: OrganizerWaitlistRow[];
};

function RegistrationPanelContent({
  tournament,
  listKind,
  isOrganizer,
  canManage,
  canCheckIn,
  rows,
  divisions,
  captainIds,
  waiverSummary,
  paymentSummary,
  waitlistRows,
}: RegistrationPanelContentProps) {
  return (
    <div className="space-y-3">
      <RegistrationPanelDescription
        listKind={listKind}
        isOrganizer={isOrganizer}
        canManage={canManage}
        hasRows={rows.length > 0}
      />
      <RegistrationList
        tournamentId={tournament.id}
        tournamentSlug={tournament.slug}
        registrations={rows}
        divisions={divisions}
        listKind={listKind}
        applicantView={listKind === "pending" && !isOrganizer}
        canManageRegistrations={canManage}
        canCheckIn={canCheckIn}
        canWithdraw={canRegisterTeams(tournament)}
        captainTeamIds={captainIds}
        waiverSummary={waiverSummary}
        showWaiverStatus={listKind === "teams" && tournament.waiverEnabled}
        paymentSummary={paymentSummary}
        showPaymentStatus={tournament.paymentEnabled}
      />
      {listKind === "pending" && isOrganizer && (
        <WaitlistControls
          tournamentId={tournament.id}
          rows={waitlistRows}
          canManage={canManage}
        />
      )}
    </div>
  );
}

export async function TournamentRegistrationsPanel({
  tournament,
  user,
  listKind,
}: {
  tournament: Tournament;
  user: UserForPermissions;
  listKind: ListKind;
}) {
  const isOrganizer = await resolveIsTournamentOrganizer(tournament, user);
  const [canManage, canCheckIn, allRows, memberRows, divisionOptions, waiting] =
    await Promise.all([
      isOrganizer && canEditRegistrations(tournament, user),
      isOrganizer && canCheckInRegistrations(tournament, user),
      loadTournamentRegistrations(tournament.id),
      loadMemberRows(user.id),
      loadDivisionOptions(tournament.id),
      loadOrganizerWaitlist(
        tournament.id,
        isOrganizer && listKind === "pending"
      ),
    ]);
  const { myTeamIds, captainIds } = membershipSets(memberRows);
  const rows = visibleRegistrationRows(
    allRows,
    listKind,
    isOrganizer,
    myTeamIds
  );
  const [waiverSummary, paymentSummary] = await loadCompliance(
    tournament,
    listKind,
    rows
  );
  return (
    <RegistrationPanelContent
      tournament={tournament}
      listKind={listKind}
      isOrganizer={isOrganizer}
      canManage={canManage}
      canCheckIn={canCheckIn}
      rows={rows}
      divisions={divisionOptions}
      captainIds={captainIds}
      waiverSummary={waiverSummary}
      paymentSummary={paymentSummary}
      waitlistRows={organizerWaitlistRows(waiting, allRows, tournament.gender)}
    />
  );
}
