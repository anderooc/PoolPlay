"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Check, Loader2, UserCheck, X } from "lucide-react";
import {
  setRegistrationDivision,
  updateRegistrationStatus,
} from "../actions";
import { withdrawRegistration } from "./register/actions";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Registration {
  id: string;
  status: string;
  registeredAt: Date;
  teamId: string;
  teamName: string;
  teamUniversity: string;
  divisionId: string | null;
  divisionName: string | null;
}

type DivisionOption = { id: string; name: string };

type ListKind = "teams" | "pending";

type PendingChange = {
  regId: string;
  expectedDivisionId: string | null;
  expectedStatus: string | null;
};

function registrationStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending approval";
    case "confirmed":
      return "Confirmed";
    case "checked_in":
      return "Checked in";
    default:
      return status.replace(/_/g, " ");
  }
}

function isPendingChangeComplete(
  pending: PendingChange,
  registrations: Registration[]
): boolean {
  const reg = registrations.find((r) => r.id === pending.regId);
  if (!reg) return true;
  const divMatch =
    pending.expectedDivisionId === undefined ||
    pending.expectedDivisionId === null
      ? true
      : reg.divisionId === pending.expectedDivisionId;
  const statusMatch =
    pending.expectedStatus === null || reg.status === pending.expectedStatus;
  return divMatch && statusMatch;
}

export function RegistrationList({
  tournamentId,
  registrations,
  divisions,
  listKind,
  applicantView = false,
  canManageRegistrations,
  canCheckIn,
  canWithdraw,
  captainTeamIds,
}: {
  tournamentId: string;
  registrations: Registration[];
  divisions: DivisionOption[];
  /** Confirmed roster vs awaiting approval. */
  listKind: ListKind;
  /** Applicant-facing layout: status box on the right, no organizer controls. */
  applicantView?: boolean;
  canManageRegistrations: boolean;
  canCheckIn: boolean;
  canWithdraw: boolean;
  captainTeamIds: Set<string>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePending =
    pending && !isPendingChangeComplete(pending, registrations)
      ? pending
      : null;

  useEffect(() => {
    return () => {
      if (safetyRef.current) clearTimeout(safetyRef.current);
    };
  }, []);

  const handleDivisionChange = useCallback(
    async (regId: string, value: string) => {
      setErrorMap((m) => {
        const next = { ...m };
        delete next[regId];
        return next;
      });
      const nextId = value === "__unassigned__" ? null : value;
      setPending({ regId, expectedDivisionId: nextId, expectedStatus: null });
      if (safetyRef.current) clearTimeout(safetyRef.current);
      try {
        const result = await setRegistrationDivision(regId, nextId);
        if (result?.error) {
          setErrorMap((m) => ({ ...m, [regId]: result.error! }));
          setPending(null);
          return;
        }
        await router.refresh();
        safetyRef.current = setTimeout(() => {
          safetyRef.current = null;
          setPending((cur) => (cur?.regId === regId ? null : cur));
        }, 8_000);
      } catch {
        setPending(null);
      }
    },
    [router]
  );

  const handleStatusChange = useCallback(
    async (
      regId: string,
      status: "confirmed" | "pending" | "checked_in"
    ) => {
      setPending({ regId, expectedDivisionId: null, expectedStatus: status });
      if (safetyRef.current) clearTimeout(safetyRef.current);
      try {
        const result = await updateRegistrationStatus(regId, status);
        if (result?.error) {
          setErrorMap((m) => ({ ...m, [regId]: result.error! }));
          setPending(null);
          return;
        }
        await router.refresh();
        safetyRef.current = setTimeout(() => {
          safetyRef.current = null;
          setPending((cur) => (cur?.regId === regId ? null : cur));
        }, 8_000);
      } catch {
        setPending(null);
      }
    },
    [router]
  );

  const handleWithdraw = useCallback(
    async (teamId: string) => {
      setErrorMap((m) => {
        const next = { ...m };
        delete next[teamId];
        return next;
      });
      try {
        const result = await withdrawRegistration(tournamentId, teamId);
        if (result?.error) {
          setErrorMap((m) => ({ ...m, [teamId]: result.error! }));
          return;
        }
        await router.refresh();
      } catch {
        /* ignore */
      }
    },
    [router, tournamentId]
  );

  if (registrations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            {listKind === "pending"
              ? applicantView
                ? "No pending application for your team."
                : "No teams awaiting approval."
              : "No confirmed teams yet."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const showDivisionAssignment =
    listKind === "teams" && canManageRegistrations && divisions.length > 0;

  return (
    <div className="space-y-3">
      {registrations.map((reg) => {
        const isBusy = activePending?.regId === reg.id;
        const anyBusy = activePending !== null;
        const rowError = errorMap[reg.id] ?? errorMap[reg.teamId] ?? null;
        const canWithdrawRow =
          canWithdraw &&
          (canManageRegistrations || captainTeamIds.has(reg.teamId));

        return (
          <div
            key={reg.id}
            className={cn(
              "relative flex flex-col gap-3 rounded-md border p-3 transition-opacity duration-150 sm:flex-row sm:justify-between",
              applicantView ? "sm:items-center" : "sm:items-start",
              isBusy && "opacity-60"
            )}
          >
            {isBusy && (
              <div
                className="pointer-events-auto absolute inset-0 z-10 flex cursor-wait items-center justify-center rounded-md bg-background/60 backdrop-blur-[1px]"
                aria-hidden
              >
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{reg.teamName}</p>
              <p className="text-sm text-muted-foreground">
                {reg.teamUniversity}
              </p>
              {showDivisionAssignment ? (
                <div className="mt-2 max-w-xs space-y-1">
                  <Label
                    htmlFor={`division-${reg.id}`}
                    className="text-xs"
                  >
                    Pool
                  </Label>
                  <Select
                    disabled={anyBusy}
                    value={reg.divisionId ?? "__unassigned__"}
                    onValueChange={(v) => {
                      if (typeof v === "string")
                        void handleDivisionChange(reg.id, v);
                    }}
                  >
                    <SelectTrigger
                      id={`division-${reg.id}`}
                      className="w-full"
                    >
                      <SelectValue placeholder="Assign pool">
                        {(v) => {
                          if (v === "__unassigned__" || v == null)
                            return "Unassigned";
                          const d = divisions.find((x) => x.id === v);
                          return d?.name ?? String(v);
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned__">Unassigned</SelectItem>
                      {divisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rowError && (
                    <p className="text-xs text-destructive">{rowError}</p>
                  )}
                </div>
              ) : listKind === "teams" ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {reg.divisionName ?? (
                    <span className="italic">Pool not assigned yet</span>
                  )}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              {applicantView ? (
                <div
                  className={cn(
                    "min-w-[9.5rem] rounded-md border px-4 py-3 text-center",
                    reg.status === "pending"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-border bg-muted/30"
                  )}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {registrationStatusLabel(reg.status)}
                  </p>
                </div>
              ) : (
                <Badge
                  variant={
                    reg.status === "confirmed" || reg.status === "checked_in"
                      ? "default"
                      : "secondary"
                  }
                >
                  {reg.status.replace(/_/g, " ")}
                </Badge>
              )}
              {listKind === "pending" &&
                canManageRegistrations &&
                reg.status === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={anyBusy}
                  onClick={() => handleStatusChange(reg.id, "confirmed")}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Confirm
                </Button>
              )}
              {listKind === "teams" &&
                canCheckIn &&
                reg.status === "confirmed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={anyBusy}
                    onClick={() => handleStatusChange(reg.id, "checked_in")}
                  >
                    <UserCheck className="mr-1 h-3 w-3" />
                    Check in
                  </Button>
                )}
              {canWithdrawRow && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={anyBusy}
                  onClick={() => handleWithdraw(reg.teamId)}
                >
                  <X className="mr-1 h-3 w-3" />
                  {canManageRegistrations ? "Delete" : "Withdraw"}
                </Button>
              )}
              {rowError && applicantView && (
                <p className="text-xs text-destructive">{rowError}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
