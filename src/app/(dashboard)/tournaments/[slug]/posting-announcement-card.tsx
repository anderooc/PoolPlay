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

import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TEAM_REGIONS } from "@/lib/constants/team";
import { formatTeamGender, formatTeamRegion } from "@/lib/labels/team";
import { defaultPostingAnnouncement, POSTING_ANNOUNCEMENT_BODY_MAX, POSTING_ANNOUNCEMENT_WEEKLY_LIMIT } from "@/lib/tournaments/posting-announcement-copy";
import { formatTournamentDateDisplay } from "@/lib/date-iso";
import {
  previewMatchingCaptainRecipients,
  sendMatchingCaptainAnnouncement,
} from "./messages/actions";
import type { TeamGender, TeamRegion } from "@/types";

export function TournamentPostingAnnouncementCard({
  tournamentId,
  tournamentName,
  tournamentDate,
  location,
  gender,
  region,
  status,
  canEdit,
  recentAnnouncementCount,
}: {
  tournamentId: string;
  tournamentName: string;
  tournamentDate: string;
  location: string;
  gender: TeamGender;
  region: TeamRegion;
  status: string;
  canEdit: boolean;
  recentAnnouncementCount: number;
}) {
  const router = useRouter();
  const defaults = defaultPostingAnnouncement({
    tournamentName,
    dateDisplay: formatTournamentDateDisplay(tournamentDate),
    location,
    gender,
    regions: [region],
  });
  const [regions, setRegions] = useState<TeamRegion[]>([region]);
  const [subject, setSubject] = useState(defaults.subject);
  const [body, setBody] = useState(defaults.body);
  const [sendEmail, setSendEmail] = useState(true);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const published = status !== "draft";
  const remainingSends = Math.max(
    0,
    POSTING_ANNOUNCEMENT_WEEKLY_LIMIT - recentAnnouncementCount
  );

  useEffect(() => {
    if (!canEdit || !published) return;
    let cancelled = false;
    setPreviewLoading(true);
    void previewMatchingCaptainRecipients(tournamentId, regions).then((result) => {
      if (cancelled) return;
      if ("success" in result && result.success) {
        setRecipientCount(result.recipientCount);
        setSkipped(result.skippedNoCaptainCount);
      } else {
        setRecipientCount(0);
        setSkipped(0);
      }
      setPreviewLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canEdit, published, regions, tournamentId]);

  function toggleRegion(value: TeamRegion, checked: boolean) {
    setRegions((prev) => {
      if (value === region) {
        return prev.includes(region) ? prev : [region, ...prev];
      }
      if (checked) {
        return prev.includes(value) ? prev : [...prev, value];
      }
      return prev.filter((item) => item !== value);
    });
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    setSuccess(null);
    const result = await sendMatchingCaptainAnnouncement(tournamentId, {
      regions,
      subject,
      body,
      sendEmail,
    });
    if ("error" in result && result.error) {
      setError(result.error);
      setSending(false);
      return;
    }
    if ("success" in result && result.success) {
      const emailNote = result.emailError
        ? ` ${result.emailError}`
        : result.emailSent
          ? " Email sent."
          : sendEmail
            ? ""
            : " In-app only.";
      setSuccess(
        `Notified ${result.recipientCount} captain${result.recipientCount === 1 ? "" : "s"}.${emailNote}`
      );
      setSending(false);
      startTransition(() => router.refresh());
      return;
    }
    setSending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4" />
          Notify matching captains
        </CardTitle>
        <CardDescription>
          Reach captains of {formatTeamGender(gender)} teams who are not already
          registered. The tournament region ({formatTeamRegion(region)}) stays
          selected; add neighboring regions if you want a wider audience.
          Notifications appear in the Notification Center
          {sendEmail ? " and by email" : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!published ? (
          <p className="text-sm text-muted-foreground">
            Open registration first so captains can see the tournament, then
            send this announcement.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Gender is locked to {formatTeamGender(gender)} for this tournament.
        </p>
        <div className="space-y-2">
          <Label>Regions</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TEAM_REGIONS.map((value) => {
              const checked = regions.includes(value);
              return (
                <label
                  key={value}
                  className="flex min-h-9 items-center gap-2 rounded-md border border-border/70 px-2.5 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    disabled={!canEdit || !published || sending || value === region}
                    onCheckedChange={(next) =>
                      toggleRegion(value, next === true)
                    }
                  />
                  <span>
                    {formatTeamRegion(value)}
                    {value === region ? " (tournament)" : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="posting-subject">Subject</Label>
          <Input
            id="posting-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={!canEdit || !published || sending}
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="posting-body">Message</Label>
          <Textarea
            id="posting-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            disabled={!canEdit || !published || sending}
            maxLength={POSTING_ANNOUNCEMENT_BODY_MAX}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={sendEmail}
            disabled={!canEdit || !published || sending}
            onCheckedChange={(next) => setSendEmail(next === true)}
          />
          Also send email
        </label>
        <p className="text-sm text-muted-foreground">
          {previewLoading
            ? "Counting matching captains…"
            : `${recipientCount ?? 0} captain${recipientCount === 1 ? "" : "s"} will be notified.`}
          {skipped > 0
            ? ` ${skipped} matching team(s) have no captain.`
            : ""}
          {` ${remainingSends} of ${POSTING_ANNOUNCEMENT_WEEKLY_LIMIT} posting announcements remaining this week.`}
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? (
          <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={
            !canEdit ||
            !published ||
            sending ||
            remainingSends <= 0 ||
            regions.length === 0 ||
            !subject.trim() ||
            !body.trim()
          }
          onClick={() => void handleSend()}
        >
          <Send className="mr-1 h-3.5 w-3.5" />
          {sending ? "Sending…" : "Notify captains"}
        </Button>
      </CardContent>
    </Card>
  );
}
