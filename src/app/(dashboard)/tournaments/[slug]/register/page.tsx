/*
 * brackt - Collegiate club volleyball tournament hub
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

import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  teams,
  teamMembers,
  schools,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import {
  isSchoolVerifiedForTournament,
  teamEligibleForTournamentRegistrationFilter,
} from "@/lib/tournaments/registration-eligibility";
import { getTournamentBySlugIfVisible } from "@/lib/tournaments/access";
import { getHostSchoolById } from "@/lib/tournaments/host-school";
import { formatTeamGender } from "@/lib/labels/team";
import {
  canRegisterTeams,
  resolveIsTournamentOrganizer,
} from "@/lib/tournaments/permissions";
import {
  paymentInstructionsText,
  paymentSettingsFromTournament,
} from "@/lib/tournaments/payment-settings";
import type { Metadata } from "next";
import { getTournamentNameBySlug } from "@/lib/tournaments/metadata";
import { pageMetadata, pageTitle } from "@/lib/metadata";
import { registrationAvailabilityOpen } from "@/lib/tournaments/public-refresh-policy";
import { loadApplicantWaitlistState } from "@/lib/tournaments/applicant-waitlist";
import { waitingTeamIdsForTournament } from "@/lib/tournaments/registrations";
import {
  RegistrationClosedView,
  RegistrationOpenView,
} from "./registration-availability-panel";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ withdrawn?: string; withdrawError?: string }>;
}

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const name = await getTournamentNameBySlug(slug);
  if (!name) return pageMetadata("Register");
  return pageMetadata(pageTitle("Register", name));
}

const teamSelectFields = {
  id: teams.id,
  name: teams.name,
  university: teams.university,
  schoolId: teams.schoolId,
  schoolName: schools.name,
} as const;

type VisibleTournament = NonNullable<
  Awaited<ReturnType<typeof getTournamentBySlugIfVisible>>
>;

async function loadHostOptions(
  tournament: VisibleTournament,
  isHost: boolean
) {
  const [hostSchool, allSchools] = await Promise.all([
    isHost && tournament.hostSchoolId
      ? getHostSchoolById(tournament.hostSchoolId)
      : Promise.resolve(null),
    isHost
      ? db
          .select({
            id: schools.id,
            name: schools.name,
            university: schools.university,
          })
          .from(schools)
          .where(eq(schools.verificationStatus, "verified"))
          .orderBy(asc(schools.name))
      : Promise.resolve([]),
  ]);
  const hostSchoolVerified =
    hostSchool != null &&
    isSchoolVerifiedForTournament(hostSchool.verificationStatus);
  return { hostSchool, allSchools, hostSchoolVerified };
}

async function loadCandidateTeams(
  tournament: VisibleTournament,
  userId: string,
  isHost: boolean,
  hostSchoolVerified: boolean
) {
  if (isHost) {
    if (!tournament.hostSchoolId || !hostSchoolVerified) return [];
    return db
      .select(teamSelectFields)
      .from(teams)
      .leftJoin(schools, eq(teams.schoolId, schools.id))
      .where(
        and(
          eq(teams.gender, tournament.gender),
          eq(teams.schoolId, tournament.hostSchoolId)
        )
      )
      .orderBy(asc(teams.name));
  }
  return db
    .select(teamSelectFields)
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .leftJoin(schools, eq(teams.schoolId, schools.id))
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.role, "captain"),
        eq(teams.gender, tournament.gender),
        teamEligibleForTournamentRegistrationFilter
      )
    )
    .orderBy(asc(schools.name), asc(teams.name));
}

async function loadRegistrationFormState(
  tournament: VisibleTournament,
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  registrationState: Awaited<ReturnType<typeof loadApplicantWaitlistState>>
) {
  const isHost = await resolveIsTournamentOrganizer(tournament, user);
  const [options, waitingTeamIds] = await Promise.all([
    loadHostOptions(tournament, isHost),
    waitingTeamIdsForTournament(tournament.id),
  ]);
  const candidateTeams = await loadCandidateTeams(
    tournament,
    user.id,
    isHost,
    options.hostSchoolVerified
  );
  const unavailableTeamIds = new Set([
    ...registrationState.registeredRows.map((row) => row.teamId),
    ...waitingTeamIds,
  ]);
  const teams = candidateTeams.filter(
    (team) => !unavailableTeamIds.has(team.id)
  );
  const hostSchool =
    isHost && tournament.hostSchoolId && options.hostSchoolVerified
      ? { id: tournament.hostSchoolId, name: options.hostSchool!.name }
      : null;
  const genderLabel = formatTeamGender(tournament.gender);
  return {
    isHost,
    teams,
    schools: options.allSchools,
    hostSchool,
    genderLabel,
    showForm: isHost ? options.allSchools.length > 0 : teams.length > 0,
    emptyMessage: isHost
      ? "No verified schools are available yet."
      : `You don't have any ${genderLabel} teams eligible to register. Teams must be admin-approved (standalone) or under a verified school.`,
  };
}

type ApplicantState = Awaited<ReturnType<typeof loadApplicantWaitlistState>>;
type ApplicantAvailability = NonNullable<
  ApplicantState["registrationAvailability"]
>;

function registrationPresentationIsOpen(
  tournament: VisibleTournament,
  availability: ApplicantAvailability
): boolean {
  return (
    canRegisterTeams({ ...tournament, status: availability.status }) &&
    registrationAvailabilityOpen(
      availability.status,
      availability,
      new Date().toISOString()
    )
  );
}

function closedRegistrationView(
  tournament: VisibleTournament,
  registrationState: ApplicantState,
  availability: ApplicantAvailability
) {
  return (
    <RegistrationClosedView
      tournamentSlug={tournament.slug}
      availability={availability}
      applicantRows={registrationState.applicantWaitlistRows}
      tournamentId={
        availability.status === "registration_open" ? tournament.id : undefined
      }
    />
  );
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const feedback = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tournament = await getTournamentBySlugIfVisible(slug, user);
  if (!tournament) notFound();

  const registrationState = await loadApplicantWaitlistState({
    tournamentId: tournament.id,
    userId: user.id,
  });
  const registrationAvailability = registrationState.registrationAvailability;
  if (!registrationAvailability) notFound();
  const presentationOpen = registrationPresentationIsOpen(
    tournament,
    registrationAvailability
  );

  if (!presentationOpen) {
    return closedRegistrationView(
      tournament,
      registrationState,
      registrationAvailability
    );
  }
  const form = await loadRegistrationFormState(
    tournament,
    user,
    registrationState
  );
  return (
    <RegistrationOpenView
      tournament={tournament}
      availability={registrationAvailability}
      applicantRows={registrationState.applicantWaitlistRows}
      paymentInstructions={paymentInstructionsText(
        paymentSettingsFromTournament(tournament)
      )}
      feedback={feedback}
      {...form}
    />
  );
}
