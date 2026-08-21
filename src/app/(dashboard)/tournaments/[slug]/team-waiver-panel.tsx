"use client";

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

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TournamentWaiverSettings } from "@/lib/tournaments/waiver-access";
import type {
  TeamWaiverCompliance,
  WaiverCompletionMethod,
} from "@/lib/tournaments/waiver-compliance";
import {
  acknowledgeWaiverDigitally,
  captainAttestWaiverPlayer,
  clearWaiverCompletion,
  hostWaivePlayerWaiver,
} from "./waiver/actions";

function methodLabel(method: WaiverCompletionMethod | null): string {
  switch (method) {
    case "digital":
      return "Digital";
    case "captain_attested":
      return "Captain attested";
    case "host_override":
      return "Host waived";
    default:
      return "Pending";
  }
}

type TeamWaiverSection = {
  teamId: string;
  teamName: string;
  compliance: TeamWaiverCompliance;
};

export function TeamWaiverPanel({
  tournamentId,
  slug,
  settings,
  teams,
  currentUserId,
  captainTeamIds,
  isOrganizer,
}: {
  tournamentId: string;
  slug: string;
  settings: TournamentWaiverSettings;
  teams: TeamWaiverSection[];
  currentUserId: string;
  captainTeamIds: Set<string>;
  isOrganizer: boolean;
}) {
  const router = useRouter();
  const waiverUrl = `/tournaments/${slug}/waiver`;
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedName, setSignedName] = useState<Record<string, string>>({});

  if (!settings.enabled || teams.length === 0) return null;

  async function runAction(
    playerUserId: string,
    action: () => Promise<{ error?: string; success?: boolean }>
  ) {
    setBusyUserId(playerUserId);
    setError(null);
    const result = await action();
    if (result?.error) {
      setError(result.error);
      setBusyUserId(null);
      return;
    }
    setBusyUserId(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {teams.map((team) => {
        const isCaptain = captainTeamIds.has(team.teamId);
        const myStatus = team.compliance.roster.find(
          (member) => member.userId === currentUserId
        );
        const canAttestOffline =
          isCaptain &&
          (settings.allowDownloadPrint || settings.allowThirdParty);

        return (
          <Card key={team.teamId}>
            <CardHeader>
              <CardTitle className="text-base">{team.teamName}</CardTitle>
              <CardDescription>
                Waiver: {team.compliance.completedCount}/
                {team.compliance.totalCount} complete
                {team.compliance.complete ? " · Ready for check-in" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {settings.allowDownloadPrint ? (
                  <a
                    href={waiverUrl}
                    download
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "inline-flex items-center gap-2",
                    })}
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </a>
                ) : null}
                {settings.allowThirdParty && settings.thirdPartyUrl ? (
                  <a
                    href={settings.thirdPartyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "inline-flex items-center gap-2",
                    })}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Sign externally
                  </a>
                ) : null}
              </div>

              {settings.allowDigitalAck &&
              myStatus &&
              !myStatus.completed ? (
                <div className="space-y-2 rounded-md border border-border/80 bg-muted/20 p-3">
                  <p className="text-sm font-medium">Your digital acknowledgment</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`signed-name-${team.teamId}`}>
                        Full legal name
                      </Label>
                      <Input
                        id={`signed-name-${team.teamId}`}
                        value={signedName[team.teamId] ?? ""}
                        onChange={(e) =>
                          setSignedName((prev) => ({
                            ...prev,
                            [team.teamId]: e.target.value,
                          }))
                        }
                        placeholder="As it appears on the waiver"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyUserId === currentUserId}
                      onClick={() =>
                        void runAction(currentUserId, () =>
                          acknowledgeWaiverDigitally(
                            tournamentId,
                            team.teamId,
                            signedName[team.teamId] ?? ""
                          )
                        )
                      }
                    >
                      I agree
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium">Roster</p>
                <ul className="divide-y rounded-md border border-border/80">
                  {team.compliance.roster.map((member) => {
                    const busy = busyUserId === member.userId;
                    return (
                      <li
                        key={member.userId}
                        className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {member.fullName}
                            {member.role === "captain" ? (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                (captain)
                              </span>
                            ) : null}
                          </p>
                          <p
                            className={cn(
                              "text-xs",
                              member.completed
                                ? "text-muted-foreground"
                                : "text-amber-700 dark:text-amber-400"
                            )}
                          >
                            {member.completed
                              ? methodLabel(member.method)
                              : "Pending"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {isOrganizer && !member.completed ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void runAction(member.userId, () =>
                                  hostWaivePlayerWaiver(
                                    tournamentId,
                                    team.teamId,
                                    member.userId
                                  )
                                )
                              }
                            >
                              Waive
                            </Button>
                          ) : null}
                          {canAttestOffline && !member.completed ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void runAction(member.userId, () =>
                                  captainAttestWaiverPlayer(
                                    tournamentId,
                                    team.teamId,
                                    member.userId
                                  )
                                )
                              }
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Mark signed
                            </Button>
                          ) : null}
                          {(isOrganizer ||
                            (canAttestOffline &&
                              member.method === "captain_attested")) &&
                          member.completed ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                void runAction(member.userId, () =>
                                  clearWaiverCompletion(
                                    tournamentId,
                                    team.teamId,
                                    member.userId
                                  )
                                )
                              }
                            >
                              Clear
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
