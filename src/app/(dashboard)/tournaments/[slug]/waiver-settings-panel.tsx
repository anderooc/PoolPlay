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

import { useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, FileText, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TournamentWaiverSettings } from "@/lib/tournaments/waiver-access";
import {
  updateTournamentWaiverSettings,
  uploadTournamentWaiver,
} from "./waiver/actions";

type WaiverFileInfo = {
  fileName: string;
  version: number;
  uploadedAt: Date;
};

export function TournamentWaiverSettingsPanel({
  tournamentId,
  slug,
  canEdit,
  initialSettings,
  initialWaiver,
}: {
  tournamentId: string;
  slug: string;
  canEdit: boolean;
  initialSettings: TournamentWaiverSettings;
  initialWaiver: WaiverFileInfo | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waiverUrl = `/tournaments/${slug}/waiver`;

  const [settings, setSettings] = useState(initialSettings);
  const [draft, setDraft] = useState(initialSettings);
  const [waiver, setWaiver] = useState(initialWaiver);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settingsDirty =
    draft.enabled !== settings.enabled ||
    draft.allowDownloadPrint !== settings.allowDownloadPrint ||
    draft.allowThirdParty !== settings.allowThirdParty ||
    draft.allowDigitalAck !== settings.allowDigitalAck ||
    draft.thirdPartyUrl !== settings.thirdPartyUrl ||
    draft.requiredBeforeCheckIn !== settings.requiredBeforeCheckIn;

  async function handleUpload(file: File) {
    if (!canEdit) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadTournamentWaiver(tournamentId, formData);
    if (result?.error) {
      setError(result.error);
      setUploading(false);
      return;
    }
    if ("success" in result && result.success && result.waiver) {
      setWaiver({
        fileName: result.waiver.fileName,
        version: result.waiver.version,
        uploadedAt: new Date(result.waiver.uploadedAt),
      });
      setUploading(false);
      startTransition(() => router.refresh());
    } else {
      setUploading(false);
    }
  }

  async function handleSaveSettings() {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    const result = await updateTournamentWaiverSettings(tournamentId, {
      enabled: draft.enabled,
      allowDownloadPrint: draft.allowDownloadPrint,
      allowThirdParty: draft.allowThirdParty,
      allowDigitalAck: draft.allowDigitalAck,
      thirdPartyUrl: draft.thirdPartyUrl ?? "",
      requiredBeforeCheckIn: draft.requiredBeforeCheckIn,
    });
    if (result?.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    if ("success" in result && result.success) {
      setSettings(draft);
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
          <FileText className="h-4 w-4" />
          Tournament waiver
        </CardTitle>
        <CardDescription>
          Upload the waiver PDF teams must sign. Choose how registered teams may
          complete it — download and print, a third-party link, or in-app
          acknowledgment per player.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {canEdit ? (
          <div className="space-y-2">
            <Label htmlFor="waiver-upload">Waiver PDF</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                id="waiver-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                {uploading ? "Uploading…" : waiver ? "Upload new version" : "Upload PDF"}
              </Button>
              {waiver ? (
                <span className="text-sm text-muted-foreground">
                  v{waiver.version} · {waiver.fileName}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  No waiver uploaded yet
                </span>
              )}
            </div>
          </div>
        ) : waiver ? (
          <p className="text-sm text-muted-foreground">
            Current waiver: v{waiver.version} · {waiver.fileName}
          </p>
        ) : null}

        {waiver ? (
          <div className="flex flex-wrap gap-2 border-t pt-4">
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
              Download waiver
            </a>
          </div>
        ) : null}

        {canEdit ? (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="waiver-enabled"
                checked={draft.enabled}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({ ...prev, enabled: checked === true }))
                }
              />
              <Label htmlFor="waiver-enabled">Require waiver for registered teams</Label>
            </div>

            <div className="space-y-3 pl-1">
              <p className="text-sm font-medium">Allowed completion methods</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="waiver-download"
                  checked={draft.allowDownloadPrint}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({
                      ...prev,
                      allowDownloadPrint: checked === true,
                    }))
                  }
                />
                <Label htmlFor="waiver-download">
                  Download and print (captain attests per player)
                </Label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="waiver-third-party"
                    checked={draft.allowThirdParty}
                    onCheckedChange={(checked) =>
                      setDraft((prev) => ({
                        ...prev,
                        allowThirdParty: checked === true,
                      }))
                    }
                  />
                  <Label htmlFor="waiver-third-party">
                    Third-party signing link (captain attests per player)
                  </Label>
                </div>
                {draft.allowThirdParty ? (
                  <Input
                    value={draft.thirdPartyUrl ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        thirdPartyUrl: e.target.value,
                      }))
                    }
                    placeholder="https://…"
                    className="max-w-lg"
                  />
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="waiver-digital"
                  checked={draft.allowDigitalAck}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({
                      ...prev,
                      allowDigitalAck: checked === true,
                    }))
                  }
                />
                <Label htmlFor="waiver-digital">
                  Digital acknowledgment in ShootSet (each player signs)
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="waiver-check-in"
                checked={draft.requiredBeforeCheckIn}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({
                    ...prev,
                    requiredBeforeCheckIn: checked === true,
                  }))
                }
              />
              <Label htmlFor="waiver-check-in">
                Block check-in until every roster player is complete
              </Label>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="button"
              size="sm"
              onClick={() => void handleSaveSettings()}
              disabled={saving || !settingsDirty}
            >
              {saving ? "Saving…" : "Save waiver settings"}
            </Button>
          </div>
        ) : settings.enabled && draft.allowThirdParty && draft.thirdPartyUrl ? (
          <div className="border-t pt-4">
            <a
              href={draft.thirdPartyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "inline-flex items-center gap-2",
              })}
            >
              <ExternalLink className="h-4 w-4" />
              Open signing link
            </a>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
