import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, teamMembers, registrations, schools } from "@/lib/db/schema";
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
  isTournamentOrganizer,
} from "@/lib/tournaments/permissions";
import { TeamAttributesBadges } from "@/components/team-attributes-badges";
import {
  paymentInstructionsText,
  paymentSettingsFromTournament,
} from "@/lib/tournaments/payment-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/layout/back-link";
import { RegisterForm } from "./register-form";
import type { Metadata } from "next";
import { getTournamentNameBySlug } from "@/lib/tournaments/metadata";
import { pageMetadata, pageTitle } from "@/lib/metadata";

interface Props {
  params: Promise<{ slug: string }>;
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

export default async function RegisterPage({ params }: Props) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tournament = await getTournamentBySlugIfVisible(slug, user);
  if (!tournament) notFound();

  const id = tournament.id;

  if (!canRegisterTeams(tournament)) {
    return (
      <div className="space-y-3">
        <BackLink href={`/tournaments/${tournament.slug}`}>
          Back to tournament
        </BackLink>
        <div className="mx-auto max-w-lg">
          <Card className="relative overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 text-foreground/[0.05] bg-dot-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]"
            />
            <CardContent className="relative py-12 text-center">
              <p className="font-heading text-base font-semibold tracking-tight">
                Registration closed
              </p>
              <p className="mt-1.5 text-pretty text-sm text-muted-foreground">
                Registration is not currently open for this tournament.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isHost = isTournamentOrganizer(tournament, user);
  const tournamentGenderLabel = formatTeamGender(tournament.gender);

  const [existingRegs, hostSchool, allSchools] = await Promise.all([
    db
      .select({ teamId: registrations.teamId })
      .from(registrations)
      .where(eq(registrations.tournamentId, id)),
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

  const candidateTeams = isHost
    ? tournament.hostSchoolId && hostSchoolVerified
      ? await db
          .select(teamSelectFields)
          .from(teams)
          .leftJoin(schools, eq(teams.schoolId, schools.id))
          .where(
            and(
              eq(teams.gender, tournament.gender),
              eq(teams.schoolId, tournament.hostSchoolId)
            )
          )
          .orderBy(asc(teams.name))
      : []
    : await db
        .select(teamSelectFields)
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .leftJoin(schools, eq(teams.schoolId, schools.id))
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.role, "captain"),
            eq(teams.gender, tournament.gender),
            teamEligibleForTournamentRegistrationFilter
          )
        )
        .orderBy(asc(schools.name), asc(teams.name));

  const alreadyRegisteredIds = new Set(existingRegs.map((r) => r.teamId));
  const availableTeams = candidateTeams.filter(
    (t) => !alreadyRegisteredIds.has(t.id)
  );

  const hostSchoolForForm =
    isHost && tournament.hostSchoolId && hostSchool && hostSchoolVerified
      ? { id: tournament.hostSchoolId, name: hostSchool.name }
      : null;

  const showForm = isHost
    ? allSchools.length > 0
    : availableTeams.length > 0;

  const emptyMessage = isHost
    ? "No verified schools are available yet."
    : `You don't have any ${tournamentGenderLabel} teams eligible to register. Teams must be admin-approved (standalone) or under a verified school.`;

  const paymentInstructions = paymentInstructionsText(
    paymentSettingsFromTournament(tournament)
  );

  return (
    <div className="space-y-3">
      <BackLink href={`/tournaments/${tournament.slug}`}>
        Back to tournament
      </BackLink>
      <div className="mx-auto max-w-lg">
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>
              {isHost ? "Add teams to" : "Register for"} {tournament.name}
            </CardTitle>
            <TeamAttributesBadges
              gender={tournament.gender}
              region={tournament.region}
              className="mt-2"
            />
            {isHost ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {hostSchoolForForm ? (
                  <>
                    Choose a school, then select {tournamentGenderLabel} teams
                    to add. Starts with{" "}
                    <span className="font-medium text-foreground">
                      {hostSchoolForForm.name}
                    </span>
                    . Pool and group placement can be set later, and host-added
                    teams are confirmed automatically.
                  </>
                ) : (
                  <>
                    Choose a school, then select {tournamentGenderLabel} teams
                    to add. Pool and group placement can be set later, and
                    host-added teams are confirmed automatically.
                  </>
                )}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Select one or more {tournamentGenderLabel} teams to register for
                this event.
              </p>
            )}
          </CardHeader>
          <CardContent className="overflow-visible">
            {paymentInstructions && !isHost ? (
              <div className="mb-4 rounded-md border border-border/80 bg-muted/20 p-3">
                <p className="text-sm font-medium">Entry fee</p>
                <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                  {paymentInstructions}
                </pre>
                <p className="mt-2 text-xs text-muted-foreground">
                  After registering, mark payment as sent on the tournament
                  Payment tab.
                </p>
              </div>
            ) : null}
            {showForm ? (
              <RegisterForm
                tournamentId={id}
                tournamentSlug={tournament.slug}
                teams={availableTeams}
                asHost={isHost}
                hostSchool={hostSchoolForForm}
                schools={isHost ? allSchools : undefined}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
