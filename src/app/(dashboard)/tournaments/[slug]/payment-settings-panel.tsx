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
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TournamentPaymentSettings } from "@/lib/tournaments/payment-settings";
import { updateTournamentPaymentSettings } from "./payment/actions";

function centsToDollarInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

type DraftSettings = {
  enabled: boolean;
  requiredBeforeConfirm: boolean;
  firstTeamFeeDollars: string;
  additionalTeamFeeDollars: string;
  venmoHandle: string;
  zelleHandle: string;
  cashappHandle: string;
  otherInstructions: string;
};

function draftFromSettings(settings: TournamentPaymentSettings): DraftSettings {
  return {
    enabled: settings.enabled,
    requiredBeforeConfirm: settings.requiredBeforeConfirm,
    firstTeamFeeDollars: centsToDollarInput(settings.firstTeamFeeCents),
    additionalTeamFeeDollars: centsToDollarInput(
      settings.additionalTeamFeeCents
    ),
    venmoHandle: settings.venmoHandle ?? "",
    zelleHandle: settings.zelleHandle ?? "",
    cashappHandle: settings.cashappHandle ?? "",
    otherInstructions: settings.otherInstructions ?? "",
  };
}

export function TournamentPaymentSettingsPanel({
  tournamentId,
  canEdit,
  initialSettings,
}: {
  tournamentId: string;
  canEdit: boolean;
  initialSettings: TournamentPaymentSettings;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [draft, setDraft] = useState(() => draftFromSettings(initialSettings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settingsDirty =
    draft.enabled !== settings.enabled ||
    draft.requiredBeforeConfirm !== settings.requiredBeforeConfirm ||
    draft.firstTeamFeeDollars !==
      centsToDollarInput(settings.firstTeamFeeCents) ||
    draft.additionalTeamFeeDollars !==
      centsToDollarInput(settings.additionalTeamFeeCents) ||
    draft.venmoHandle !== (settings.venmoHandle ?? "") ||
    draft.zelleHandle !== (settings.zelleHandle ?? "") ||
    draft.cashappHandle !== (settings.cashappHandle ?? "") ||
    draft.otherInstructions !== (settings.otherInstructions ?? "");

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    const result = await updateTournamentPaymentSettings(tournamentId, draft);
    if (result?.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    if ("success" in result && result.success) {
      const next: TournamentPaymentSettings = {
        enabled: draft.enabled,
        requiredBeforeConfirm: draft.requiredBeforeConfirm,
        firstTeamFeeCents: draft.enabled
          ? Math.round(
              parseFloat(draft.firstTeamFeeDollars.replace(/[$,\s]/g, "")) *
                100
            )
          : null,
        additionalTeamFeeCents: draft.enabled
          ? draft.additionalTeamFeeDollars
            ? Math.round(
                parseFloat(
                  draft.additionalTeamFeeDollars.replace(/[$,\s]/g, "")
                ) * 100
              )
            : Math.round(
                parseFloat(draft.firstTeamFeeDollars.replace(/[$,\s]/g, "")) *
                  100
              )
          : null,
        venmoHandle: draft.venmoHandle || null,
        zelleHandle: draft.zelleHandle || null,
        cashappHandle: draft.cashappHandle || null,
        otherInstructions: draft.otherInstructions || null,
      };
      setSettings(next);
      setSaving(false);
      startTransition(() => router.refresh());
    } else {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4" />
          Tournament payments
        </CardTitle>
        <CardDescription>
          Track entry fees per team. Teams pay you directly (Venmo, Zelle, etc.)
          — brackt does not process payments. Captains mark when they&apos;ve
          sent payment; you confirm or waive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {canEdit ? (
          <>
            <div className="flex items-start gap-3">
              <Checkbox
                id="payment-enabled"
                checked={draft.enabled}
                onCheckedChange={(checked) =>
                  setDraft((d) => ({ ...d, enabled: checked === true }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="payment-enabled" className="font-medium">
                  Require entry fees
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show payment instructions to registered teams and track status
                  per registration.
                </p>
              </div>
            </div>

            {draft.enabled ? (
              <div className="space-y-4 rounded-md border border-border/80 bg-muted/20 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-team-fee">First team fee (USD)</Label>
                    <Input
                      id="first-team-fee"
                      inputMode="decimal"
                      placeholder="Amount in USD"
                      value={draft.firstTeamFeeDollars}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          firstTeamFeeDollars: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Per school — first team registered.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additional-team-fee">
                      Additional team fee (USD)
                    </Label>
                    <Input
                      id="additional-team-fee"
                      inputMode="decimal"
                      placeholder="Same as first team"
                      value={draft.additionalTeamFeeDollars}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          additionalTeamFeeDollars: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to match the first-team fee.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="venmo-handle">Venmo</Label>
                    <Input
                      id="venmo-handle"
                      placeholder="@username"
                      value={draft.venmoHandle}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          venmoHandle: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zelle-handle">Zelle</Label>
                    <Input
                      id="zelle-handle"
                      placeholder="email or phone"
                      value={draft.zelleHandle}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          zelleHandle: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashapp-handle">Cash App</Label>
                    <Input
                      id="cashapp-handle"
                      placeholder="$cashtag"
                      value={draft.cashappHandle}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          cashappHandle: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-other">Other instructions</Label>
                  <Textarea
                    id="payment-other"
                    rows={3}
                    placeholder="Check payable to…, pay at check-in, etc."
                    value={draft.otherInstructions}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        otherInstructions: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="payment-required-confirm"
                    checked={draft.requiredBeforeConfirm}
                    onCheckedChange={(checked) =>
                      setDraft((d) => ({
                        ...d,
                        requiredBeforeConfirm: checked === true,
                      }))
                    }
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="payment-required-confirm"
                      className="font-medium"
                    >
                      Block confirmation until paid
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Pending registrations cannot be confirmed until payment is
                      marked paid or waived.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <Button
              type="button"
              size="sm"
              disabled={!settingsDirty || saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save payment settings"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {settings.enabled
              ? "Entry fees are enabled for this tournament."
              : "Entry fees are not required for this tournament."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
