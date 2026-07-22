"use client";

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

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, FileText } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateTournamentPacketNotes } from "../actions";

const PACKET_NOTES_PLACEHOLDER = `Suggested sections (edit as needed):

AGENDA
• Check-in opens — time & location
• Captains meeting
• Pool warmup start
• Lunch break
• Bracket play begins

PARKING
• Cost, which garages/lots, map notes

FOOD
• Nearby options and venue food rules

CHECK-IN
• ID requirements, wristbands, spectator policy

PAYMENT
• How to pay entry fees, deposit refund rules

CONTACT
• Day-of contact name and phone

OTHER RULES
• Facility restrictions, trainer, bag policy`;

export function TournamentPacketPanel({
  tournamentId,
  slug,
  initialPacketNotes,
  canEdit,
  lockedReason,
}: {
  tournamentId: string;
  slug: string;
  initialPacketNotes: string | null;
  canEdit: boolean;
  lockedReason?: string | null;
}) {
  const router = useRouter();
  const packetUrl = `/tournaments/${slug}/packet`;
  const previewUrl = `${packetUrl}?preview=1`;
  const [notes, setNotes] = useState(initialPacketNotes ?? "");
  const [draftNotes, setDraftNotes] = useState(initialPacketNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = draftNotes !== notes;

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    const result = await updateTournamentPacketNotes(tournamentId, draftNotes);
    if (result?.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    if ("success" in result && result.success) {
      setNotes(result.packetNotes ?? "");
      setDraftNotes(result.packetNotes ?? "");
      setSaving(false);
      startTransition(() => {
        router.refresh();
      });
    } else {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Tournament packet
        </CardTitle>
        <CardDescription>
          Download a PDF for registered teams with auto-filled rules and
          schedule, plus your logistics notes. Pool and bracket settings are
          pulled from the app — you do not need to retype them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lockedReason ? (
          <p className="text-sm text-muted-foreground">{lockedReason}</p>
        ) : null}
        {canEdit ? (
          <div className="space-y-2">
            <Label htmlFor="packet-notes">Logistics & day-of notes</Label>
            <Textarea
              id="packet-notes"
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder={PACKET_NOTES_PLACEHOLDER}
              rows={14}
              className="font-mono text-sm"
              disabled={saving}
            />
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving || !dirty}
              >
                {saving ? "Saving…" : "Save packet notes"}
              </Button>
            </div>
          </div>
        ) : initialPacketNotes ? (
          <div className="space-y-2">
            <Label htmlFor="packet-notes-readonly">Logistics & day-of notes</Label>
            <Textarea
              id="packet-notes-readonly"
              value={initialPacketNotes}
              readOnly
              rows={14}
              className="font-mono text-sm"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Download the latest packet with competition rules, schedule, and
            host logistics for this event.
          </p>
        )}

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "inline-flex items-center gap-2",
            })}
          >
            <ExternalLink className="h-4 w-4" />
            Preview PDF
          </a>
          <a
            href={packetUrl}
            download
            className={buttonVariants({
              size: "sm",
              className: "inline-flex items-center gap-2",
            })}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
