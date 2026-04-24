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
import { Check, Loader2 } from "lucide-react";
import { setRegistrationDivision, updateRegistrationStatus } from "../actions";
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

type PendingChange = {
  regId: string;
  expectedDivisionId: string | null;
  expectedStatus: string | null;
};

export function RegistrationList({
  registrations,
  divisions,
  isOrganizer,
}: {
  registrations: Registration[];
  divisions: DivisionOption[];
  isOrganizer: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pending) return;
    const reg = registrations.find((r) => r.id === pending.regId);
    if (!reg) {
      setPending(null);
      return;
    }
    const divMatch =
      pending.expectedDivisionId === undefined ||
      pending.expectedDivisionId === null
        ? true
        : reg.divisionId === pending.expectedDivisionId;
    const statusMatch =
      pending.expectedStatus === null ||
      reg.status === pending.expectedStatus;
    if (divMatch && statusMatch) {
      setPending(null);
      if (safetyRef.current) {
        clearTimeout(safetyRef.current);
        safetyRef.current = null;
      }
    }
  }, [registrations, pending]);

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
        // Safety: clear after 8s if props never match
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
    async (regId: string, status: "confirmed" | "pending") => {
      setPending({ regId, expectedDivisionId: null, expectedStatus: status });
      if (safetyRef.current) clearTimeout(safetyRef.current);
      try {
        await updateRegistrationStatus(regId, status);
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

  if (registrations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No registrations yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {registrations.map((reg) => {
        const isBusy = pending?.regId === reg.id;
        const anyBusy = pending !== null;
        const rowError = errorMap[reg.id] ?? null;
        return (
          <div
            key={reg.id}
            className={cn(
              "relative flex flex-col gap-3 rounded-md border p-3 transition-opacity duration-150 sm:flex-row sm:items-start sm:justify-between",
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
              {isOrganizer && divisions.length > 0 ? (
                <div className="mt-2 max-w-xs space-y-1">
                  <Label
                    htmlFor={`division-${reg.id}`}
                    className="text-xs"
                  >
                    Division
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
                      <SelectValue placeholder="Assign division">
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
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {reg.divisionName ?? (
                    <span className="italic">Division not assigned yet</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Badge
                variant={
                  reg.status === "confirmed" ? "default" : "secondary"
                }
              >
                {reg.status}
              </Badge>
              {isOrganizer && reg.status === "pending" && (
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
