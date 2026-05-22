"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Link2,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  renameTournament,
  deleteTournament,
  updateTournamentDate,
  updateTournamentListingDetails,
} from "../actions";
import { formatTournamentDateDisplay } from "@/lib/date-iso";
import { isTournamentArchived, statusBadgeLabel } from "@/lib/tournament-status";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerField } from "@/components/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusControls } from "./status-controls";
import { TournamentHostChecklist } from "@/components/tournament-host-checklist";
import { TeamAttributesBadges } from "@/components/team-attributes-badges";
import type { HostChecklistStep } from "@/lib/tournaments/permissions";
import type { TeamGender, TeamRegion } from "@/types";
import { MapPin, Calendar, User } from "lucide-react";

type DeleteStep = "intro" | "confirm";

export function TournamentPageHeading({
  tournamentId,
  initialSlug,
  initialName,
  description,
  location,
  address,
  date,
  gender,
  region,
  organizerName,
  status,
  showRegisterLink = false,
  hostChecklistSteps = [],
}: {
  tournamentId: string;
  initialSlug: string;
  initialName: string;
  description: string | null;
  location: string;
  address: string | null;
  date: string;
  gender: TeamGender;
  region: TeamRegion;
  organizerName: string;
  status: string;
  showRegisterLink?: boolean;
  hostChecklistSteps?: HostChecklistStep[];
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(initialSlug);
  const [name, setName] = useState(initialName);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(initialName);
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const skipTitleBlurCommit = useRef(false);
  const titleCommitting = useRef(false);

  const [listingDescription, setListingDescription] = useState(description);
  const [listingLocation, setListingLocation] = useState(location);
  const [listingAddress, setListingAddress] = useState(address ?? "");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [draftDescription, setDraftDescription] = useState(description ?? "");
  const [draftLocation, setDraftLocation] = useState(location);
  const [draftAddress, setDraftAddress] = useState(address ?? "");
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [dateOpen, setDateOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(date);
  const [dateSaving, setDateSaving] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    setListingDescription(description);
    setListingLocation(location);
    setListingAddress(address ?? "");
  }, [description, location, address]);

  useEffect(() => {
    if (!detailsOpen) return;
    setDraftDescription(listingDescription ?? "");
    setDraftLocation(listingLocation);
    setDraftAddress(listingAddress);
    setDetailsError(null);
  }, [detailsOpen, listingDescription, listingLocation, listingAddress]);

  useEffect(() => {
    if (!dateOpen) setDraftDate(date);
  }, [dateOpen, date]);

  const archived = isTournamentArchived(date);

  const [copyHint, setCopyHint] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("intro");
  const [confirmText, setConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setSlug(initialSlug);
    setName(initialName);
    if (!editingTitle) setDraftTitle(initialName);
  }, [initialSlug, initialName, editingTitle]);

  useEffect(() => {
    if (!editingTitle) return;
    const id = requestAnimationFrame(() => {
      const el = titleInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [editingTitle]);

  const startRename = useCallback(() => {
    setTitleError(null);
    setDraftTitle(name);
    setEditingTitle(true);
  }, [name]);

  const cancelTitleEdit = useCallback(() => {
    skipTitleBlurCommit.current = true;
    setDraftTitle(name);
    setEditingTitle(false);
    setTitleError(null);
    queueMicrotask(() => {
      skipTitleBlurCommit.current = false;
    });
  }, [name]);

  const commitTitle = useCallback(async () => {
    if (titleCommitting.current) return;
    const next = draftTitle.trim();
    if (next === name) {
      setEditingTitle(false);
      return;
    }
    if (!next) {
      setTitleError("Name is required");
      return;
    }
    titleCommitting.current = true;
    setTitleSaving(true);
    setTitleError(null);
    const prevSlug = slug;
    const result = await renameTournament(tournamentId, draftTitle);
    if ("error" in result && result.error) {
      setTitleError(result.error);
      setTitleSaving(false);
      titleCommitting.current = false;
      return;
    }
    if ("success" in result && result.success) {
      setName(next);
      setSlug(result.slug);
      skipTitleBlurCommit.current = true;
      setEditingTitle(false);
      if (result.slug !== prevSlug) {
        router.replace(`/tournaments/${result.slug}`);
      }
      router.refresh();
      queueMicrotask(() => {
        skipTitleBlurCommit.current = false;
      });
    }
    setTitleSaving(false);
    titleCommitting.current = false;
  }, [draftTitle, name, tournamentId, router, slug]);

  async function copyPageLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyHint("Link copied");
      window.setTimeout(() => setCopyHint(null), 2500);
    } catch {
      setCopyHint("Could not copy");
      window.setTimeout(() => setCopyHint(null), 2500);
    }
  }

  function resetDeleteDialog() {
    setDeleteStep("intro");
    setConfirmText("");
    setDeleteError(null);
    setDeleteBusy(false);
  }

  async function handleDelete() {
    if (confirmText.trim() !== name.trim() || confirmText.trim() === "") return;
    setDeleteBusy(true);
    setDeleteError(null);
    const result = await deleteTournament(tournamentId, confirmText);
    if (result?.error) {
      setDeleteError(result.error);
      setDeleteBusy(false);
      return;
    }
    setDeleteOpen(false);
    resetDeleteDialog();
    router.replace("/tournaments");
    router.refresh();
  }

  const nameMatches =
    confirmText.trim() === name.trim() && confirmText.trim() !== "";

  const badgeLabel = statusBadgeLabel(status, date);
  const badgeVariant: "default" | "secondary" | "outline" = archived
    ? "outline"
    : status === "in_progress"
      ? "default"
      : "secondary";

  async function commitListingDetails() {
    setDetailsSaving(true);
    setDetailsError(null);
    const result = await updateTournamentListingDetails(tournamentId, {
      description: draftDescription,
      location: draftLocation,
      address: draftAddress,
    });
    if ("error" in result && result.error) {
      setDetailsError(result.error);
      setDetailsSaving(false);
      return;
    }
    if ("success" in result && result.success) {
      setListingDescription(result.description);
      setListingLocation(result.location);
      setListingAddress(result.address ?? "");
      setDetailsOpen(false);
      router.refresh();
    }
    setDetailsSaving(false);
  }

  async function commitDate() {
    const next = draftDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) {
      setDateError("Pick a valid date");
      return;
    }
    setDateSaving(true);
    setDateError(null);
    const result = await updateTournamentDate(tournamentId, next);
    if ("error" in result && result.error) {
      setDateError(result.error);
      setDateSaving(false);
      return;
    }
    setDateOpen(false);
    setDateSaving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          {editingTitle ? (
            <div className="min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-[min(100%,42rem)]">
              <input
                ref={titleInputRef}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                disabled={titleSaving}
                aria-label="Tournament name"
                className={cn(
                  "w-full min-w-0 border-0 border-b-2 border-primary bg-transparent px-0 py-0.5 text-2xl font-bold tracking-tight text-foreground caret-primary shadow-none outline-none ring-0 transition-[border-color] duration-150",
                  "focus-visible:border-primary focus-visible:ring-0",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  "sm:text-3xl"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitTitle();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelTitleEdit();
                  }
                }}
                onBlur={() => {
                  if (titleSaving || skipTitleBlurCommit.current) return;
                  void commitTitle();
                }}
              />
              {titleError && (
                <p className="mt-1 text-sm text-destructive">{titleError}</p>
              )}
            </div>
          ) : (
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {name}
            </h1>
          )}
          <Badge
            variant={badgeVariant}
            className={cn(
              "shrink-0",
              archived &&
                "border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground"
            )}
          >
            {badgeLabel}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {listingLocation}
              {listingAddress ? ` · ${listingAddress}` : null}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatTournamentDateDisplay(date)}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {organizerName}
          </span>
        </div>
        <TeamAttributesBadges
          gender={gender}
          region={region}
          className="mt-2"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {hostChecklistSteps.length > 0 ? (
          <TournamentHostChecklist steps={hostChecklistSteps} />
        ) : null}
        {showRegisterLink && (
          <Link
            href={`/tournaments/${slug}/register`}
            className={buttonVariants({ className: "w-full sm:w-auto" })}
          >
            Add / register teams
          </Link>
        )}
        <Link
          href={`/tournaments/${slug}/brackets`}
          className={buttonVariants({ variant: "outline" })}
        >
          Pools &amp; Brackets
        </Link>
        <Link
          href={`/tournaments/${slug}/scoring`}
          className={buttonVariants({ variant: "outline" })}
        >
          Live Scoring
        </Link>
        <StatusControls
          tournamentId={tournamentId}
          currentStatus={status}
          archived={archived}
        />
        <div className="relative flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label="Tournament options"
                />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    startRename();
                  }}
                >
                  <Pencil className="size-4" />
                  Rename tournament
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setDetailsOpen(true)}
                >
                  <FileText className="size-4" />
                  Edit listing details
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setDateOpen(true)}
                >
                  <CalendarDays className="size-4" />
                  Edit date
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => void copyPageLink()}
                >
                  <Link2 className="size-4" />
                  Copy page link
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => {
                    setDeleteOpen(true);
                    setDeleteStep("intro");
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete tournament
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {copyHint && (
            <span
              className="pointer-events-none absolute -bottom-6 right-0 whitespace-nowrap text-xs text-muted-foreground"
              role="status"
            >
              {copyHint}
            </span>
          )}
        </div>
      </div>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          if (detailsSaving) return;
          setDetailsOpen(open);
          if (!open) setDetailsError(null);
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton={!detailsSaving}>
          <DialogHeader>
            <DialogTitle>Edit listing details</DialogTitle>
            <DialogDescription>
              Update the public description, venue, and address. Include entry
              fees and start time in the description so teams know what to
              expect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="listing-description">Description</Label>
              <Textarea
                id="listing-description"
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                disabled={detailsSaving}
                rows={5}
                placeholder="Start time, entry fee for the first team, fee for each additional team, format, and other details..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="listing-location">Location</Label>
              <Input
                id="listing-location"
                value={draftLocation}
                onChange={(e) => setDraftLocation(e.target.value)}
                disabled={detailsSaving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="listing-address">Address (optional)</Label>
              <Input
                id="listing-address"
                value={draftAddress}
                onChange={(e) => setDraftAddress(e.target.value)}
                disabled={detailsSaving}
                placeholder="Street address or facility name"
              />
            </div>
          </div>
          {detailsError && (
            <p className="text-sm text-destructive" role="alert">
              {detailsError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetailsOpen(false)}
              disabled={detailsSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void commitListingDetails()}
              disabled={
                detailsSaving || draftLocation.trim().length === 0
              }
            >
              {detailsSaving ? "Saving…" : "Save details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dateOpen}
        onOpenChange={(open) => {
          if (dateSaving) return;
          setDateOpen(open);
          if (!open) setDateError(null);
        }}
      >
        <DialogContent className="sm:max-w-sm" showCloseButton={!dateSaving}>
          <DialogHeader>
            <DialogTitle>Edit tournament date</DialogTitle>
            <DialogDescription>
              {archived
                ? "Pick a new date. Setting today or later un-archives the tournament and re-enables the status dropdown."
                : "Pick the date this tournament happens."}
            </DialogDescription>
          </DialogHeader>
          <DatePickerField
            id="tournament-date"
            label="Date"
            value={draftDate}
            onChange={setDraftDate}
            disabled={dateSaving}
            rangeFromDates={[draftDate]}
          />
          {dateError && (
            <p className="text-sm text-destructive" role="alert">
              {dateError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDateOpen(false)}
              disabled={dateSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void commitDate()}
              disabled={dateSaving || draftDate.trim().length === 0}
            >
              {dateSaving ? "Saving…" : "Save date"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) resetDeleteDialog();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!deleteBusy}>
          {deleteStep === "intro" ? (
            <>
              <DialogHeader>
                <DialogTitle>Delete this tournament?</DialogTitle>
                <DialogDescription>
                  This permanently removes divisions, courts, registrations,
                  pools, brackets, scheduled matches, and scores. Teams in the
                  system are not deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteStep("confirm")}
                >
                  Confirm deletion
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirm by name</DialogTitle>
                <DialogDescription>
                  Type the tournament name exactly as shown below, then delete.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-tournament-confirm" className="sr-only">
                  Tournament name
                </Label>
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                  {name}
                </p>
                <Input
                  id="delete-tournament-confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type the full name"
                  disabled={deleteBusy}
                  autoComplete="off"
                  spellCheck={false}
                />
                {deleteError && (
                  <p className="text-sm text-destructive" role="alert">
                    {deleteError}
                  </p>
                )}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="sm:mr-auto"
                  disabled={deleteBusy}
                  onClick={() => {
                    setDeleteStep("intro");
                    setConfirmText("");
                    setDeleteError(null);
                  }}
                >
                  Back
                </Button>
                <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleteBusy}
                    onClick={() => setDeleteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!nameMatches || deleteBusy}
                    onClick={() => void handleDelete()}
                  >
                    {deleteBusy ? "Deleting…" : "Delete permanently"}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
