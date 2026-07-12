"use client";

/*
 * PoolPlay - Collegiate club volleyball tournament hub
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
import { Check, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  formatFeeCents,
  paymentInstructionsText,
  paymentMethodLabel,
  paymentStatusLabel,
  type TournamentPaymentSettings,
} from "@/lib/tournaments/payment-settings";
import type { RegistrationPaymentRow } from "@/lib/tournaments/payment-compliance";
import type { RegistrationPaymentMethod } from "@/types";
import {
  captainSubmitPayment,
  hostConfirmPayment,
  hostWaivePayment,
} from "./payment/actions";

type TeamPaymentSection = {
  registrationId: string;
  teamId: string;
  teamName: string;
  payment: RegistrationPaymentRow;
};

const PAYMENT_METHODS: RegistrationPaymentMethod[] = [
  "venmo",
  "zelle",
  "cashapp",
  "check",
  "cash",
  "other",
];

export function TeamPaymentPanel({
  settings,
  teams,
  captainTeamIds,
  isOrganizer,
}: {
  settings: TournamentPaymentSettings;
  teams: TeamPaymentSection[];
  captainTeamIds: Set<string>;
  isOrganizer: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<Record<string, RegistrationPaymentMethod>>(
    {}
  );
  const [note, setNote] = useState<Record<string, string>>({});

  const instructions = paymentInstructionsText(settings);

  if (!settings.enabled || teams.length === 0) return null;

  async function runAction(
    registrationId: string,
    action: () => Promise<{ error?: string; success?: boolean }>
  ) {
    setBusyId(registrationId);
    setError(null);
    const result = await action();
    if (result?.error) {
      setError(result.error);
      setBusyId(null);
      return;
    }
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {instructions ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How to pay</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
              {instructions}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {teams.map((team) => {
        const isCaptain = captainTeamIds.has(team.teamId);
        const isBusy = busyId === team.registrationId;
        const canSubmit =
          isCaptain && team.payment.status === "unpaid" && !isOrganizer;
        const canConfirm =
          isOrganizer &&
          (team.payment.status === "submitted" ||
            team.payment.status === "unpaid");
        const canWaive =
          isOrganizer &&
          team.payment.status !== "confirmed" &&
          team.payment.status !== "waived";
        const settled =
          team.payment.status === "confirmed" ||
          team.payment.status === "waived";

        return (
          <Card key={team.registrationId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
                {team.teamName}
              </CardTitle>
              <CardDescription>
                {formatFeeCents(team.payment.amountCents)} ·{" "}
                <span
                  className={cn(
                    settled
                      ? "text-muted-foreground"
                      : team.payment.status === "submitted"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-foreground"
                  )}
                >
                  {paymentStatusLabel(team.payment.status)}
                </span>
                {team.payment.submittedMethod ? (
                  <>
                    {" "}
                    · {paymentMethodLabel(team.payment.submittedMethod)}
                  </>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {team.payment.submittedNote ? (
                <p className="text-sm text-muted-foreground">
                  Captain note: {team.payment.submittedNote}
                </p>
              ) : null}

              {canSubmit ? (
                <div className="space-y-3 rounded-md border border-border/80 bg-muted/20 p-3">
                  <p className="text-sm font-medium">
                    Mark payment as sent
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor={`method-${team.registrationId}`}>
                        Method used
                      </Label>
                      <Select
                        value={
                          method[team.registrationId] ?? "venmo"
                        }
                        onValueChange={(v) => {
                          if (typeof v === "string") {
                            setMethod((m) => ({
                              ...m,
                              [team.registrationId]:
                                v as RegistrationPaymentMethod,
                            }));
                          }
                        }}
                      >
                        <SelectTrigger id={`method-${team.registrationId}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {paymentMethodLabel(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`note-${team.registrationId}`}>
                        Note (optional)
                      </Label>
                      <Input
                        id={`note-${team.registrationId}`}
                        placeholder="Confirmation #, date sent…"
                        value={note[team.registrationId] ?? ""}
                        onChange={(e) =>
                          setNote((n) => ({
                            ...n,
                            [team.registrationId]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBusy}
                    onClick={() =>
                      void runAction(team.registrationId, () =>
                        captainSubmitPayment({
                          registrationId: team.registrationId,
                          method:
                            method[team.registrationId] ?? "venmo",
                          note: note[team.registrationId] ?? "",
                        })
                      )
                    }
                  >
                    I&apos;ve sent payment
                  </Button>
                </div>
              ) : null}

              {isOrganizer && (canConfirm || canWaive) ? (
                <div className="flex flex-wrap gap-2">
                  {canConfirm ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      disabled={isBusy}
                      onClick={() =>
                        void runAction(team.registrationId, () =>
                          hostConfirmPayment(team.registrationId)
                        )
                      }
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Mark paid
                    </Button>
                  ) : null}
                  {canWaive ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() =>
                        void runAction(team.registrationId, () =>
                          hostWaivePayment(team.registrationId)
                        )
                      }
                    >
                      Waive fee
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
