"use client";

/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {
  startTransition,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  promoteNextWaitlistedTeam,
  removeWaitlistedTeam,
  updateTournamentRegistrationAvailability,
} from "../actions";

export type OrganizerWaitlistRow = {
  id: string;
  queueRank: number;
  teamName: string;
  schoolName: string;
  requestedAt: string;
  eligible: boolean;
};

function utcInputValue(deadline: string | null): string {
  return deadline ? deadline.slice(0, 16) : "";
}

function utcDisplay(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function useAvailabilityForm(
  tournamentId: string,
  initialCapacity: number | null,
  initialDeadline: string | null
) {
  const router = useRouter();
  const [capacity, setCapacity] = useState(initialCapacity?.toString() ?? "");
  const [deadline, setDeadline] = useState(utcInputValue(initialDeadline));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setIsPending(true);
    setMessage(null);
    try {
      const result = await updateTournamentRegistrationAvailability(
        tournamentId,
        {
          capacity: capacity === "" ? null : Number(capacity),
          deadline: deadline === "" ? null : `${deadline}:00Z`,
        }
      );
      if ("error" in result) {
        setMessage(result.error ?? "Registration availability could not be saved.");
      } else {
        setMessage("Registration availability saved.");
        startTransition(() => router.refresh());
      }
    } catch {
      setMessage("Registration availability could not be saved. Try again.");
    } finally {
      setIsPending(false);
    }
  }
  return {
    capacity, deadline, isPending, message, save, setCapacity, setDeadline,
  };
}

export function RegistrationAvailabilityForm({
  tournamentId,
  initialCapacity,
  initialDeadline,
  canEdit,
}: {
  tournamentId: string;
  initialCapacity: number | null;
  initialDeadline: string | null;
  canEdit: boolean;
}) {
  const form = useAvailabilityForm(
    tournamentId,
    initialCapacity,
    initialDeadline
  );

  return (
    <form onSubmit={form.save} className="space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Registration availability
        </h2>
        <p className="text-sm text-muted-foreground">
          Leave capacity blank for unlimited registration. Leave the deadline
          blank for no deadline.
        </p>
      </div>
      <AvailabilityInputs
        capacity={form.capacity}
        deadline={form.deadline}
        disabled={!canEdit || form.isPending}
        setCapacity={form.setCapacity}
        setDeadline={form.setDeadline}
      />
      {form.message && (
        <p className="text-sm" role="status">
          {form.message}
        </p>
      )}
      <Button type="submit" disabled={!canEdit || form.isPending}>
        {form.isPending ? "Saving..." : "Save availability"}
      </Button>
    </form>
  );
}

function AvailabilityInputs({
  capacity,
  deadline,
  disabled,
  setCapacity,
  setDeadline,
}: {
  capacity: string;
  deadline: string;
  disabled: boolean;
  setCapacity: Dispatch<SetStateAction<string>>;
  setDeadline: Dispatch<SetStateAction<string>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="registration-capacity">Team capacity</Label>
        <Input
          id="registration-capacity"
          type="number"
          min={1}
          step={1}
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          placeholder="Unlimited"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="registration-deadline">Deadline (UTC)</Label>
        <Input
          id="registration-deadline"
          type="datetime-local"
          step={60}
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Enter the exact deadline in Coordinated Universal Time (UTC).
        </p>
      </div>
    </div>
  );
}

type MessageSetter = Dispatch<SetStateAction<string | null>>;

function usePromotion(
  tournamentId: string,
  busyRef: MutableRefObject<boolean>,
  setMessage: MessageSetter
) {
  const router = useRouter();
  const operationIdRef = useRef<string | null>(null);
  const [pending, setPending] = useState(false);

  async function promote() {
    if (busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    setMessage(null);
    const operationId = operationIdRef.current ?? crypto.randomUUID();
    operationIdRef.current = operationId;
    try {
      const result = await promoteNextWaitlistedTeam(tournamentId, operationId);
      if ("error" in result) {
        operationIdRef.current = null;
        setMessage(result.error ?? "The next team could not be promoted.");
      } else {
        operationIdRef.current = null;
        setMessage("The next eligible team was promoted.");
        startTransition(() => router.refresh());
      }
    } catch {
      setMessage("Promotion could not be confirmed. Retry to reuse the same operation.");
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }
  return { pending, promote };
}

function useRemoval(
  tournamentId: string,
  busyRef: MutableRefObject<boolean>,
  setMessage: MessageSetter
) {
  const router = useRouter();
  const [entryId, setEntryId] = useState<string | null>(null);

  async function remove(waitlistEntryId: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setEntryId(waitlistEntryId);
    setMessage(null);
    try {
      const result = await removeWaitlistedTeam(tournamentId, waitlistEntryId);
      if ("error" in result) {
        setMessage(result.error ?? "The team could not be removed.");
      } else {
        setMessage("The team was removed from the waitlist.");
        startTransition(() => router.refresh());
      }
    } catch {
      setMessage("The waitlist removal could not be confirmed. Refresh and try again.");
    } finally {
      busyRef.current = false;
      setEntryId(null);
    }
  }
  return { entryId, remove };
}

export function WaitlistControls({
  tournamentId,
  rows,
  canManage,
}: {
  tournamentId: string;
  rows: OrganizerWaitlistRow[];
  canManage: boolean;
}) {
  const busyRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const promotion = usePromotion(tournamentId, busyRef, setMessage);
  const removal = useRemoval(tournamentId, busyRef, setMessage);
  const busy = promotion.pending || removal.entryId != null;

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Waitlist</h2>
          <p className="text-sm text-muted-foreground">
            Promotion selects the oldest currently eligible team.
          </p>
        </div>
        <Button
          type="button"
          onClick={promotion.promote}
          disabled={!canManage || busy || rows.length === 0}
        >
          {promotion.pending ? "Promoting..." : "Promote next team"}
        </Button>
      </div>
      {message && (
        <p className="text-sm" role="status">
          {message}
        </p>
      )}
      <WaitlistTable
        rows={rows}
        canManage={canManage}
        busy={busy}
        removingId={removal.entryId}
        remove={removal.remove}
      />
    </section>
  );
}

export function WaitlistTable({
  rows,
  canManage,
  busy,
  removingId,
  remove,
}: {
  rows: OrganizerWaitlistRow[];
  canManage: boolean;
  busy: boolean;
  removingId: string | null;
  remove: (entryId: string) => Promise<void>;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No teams are waiting.</p>;
  }
  return <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="border-b text-xs uppercase text-muted-foreground">
          <tr>
            {[
              "Position",
              "Team",
              "School",
              "Requested",
              "Eligibility",
              "Action",
            ].map((label) => (
              <th key={label} className="px-2 py-2 font-medium last:text-right">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <WaitlistTableRow
              key={row.id}
              row={row}
              canManage={canManage}
              busy={busy}
              removing={removingId === row.id}
              remove={remove}
            />
          ))}
        </tbody>
      </table>
    </div>;
}

function WaitlistTableRow({
  row,
  canManage,
  busy,
  removing,
  remove,
}: {
  row: OrganizerWaitlistRow;
  canManage: boolean;
  busy: boolean;
  removing: boolean;
  remove: (entryId: string) => Promise<void>;
}) {
  return (
    <tr>
      <td className="px-2 py-2">{row.queueRank}</td>
      <td className="px-2 py-2 font-medium">{row.teamName}</td>
      <td className="px-2 py-2">{row.schoolName}</td>
      <td className="px-2 py-2">
        <time dateTime={row.requestedAt}>{utcDisplay(row.requestedAt)} UTC</time>
      </td>
      <td className="px-2 py-2">
        {row.eligible ? "Eligible" : "Not currently eligible"}
      </td>
      <td className="px-2 py-2 text-right">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => remove(row.id)}
          disabled={!canManage || busy}
        >
          {removing ? "Removing..." : "Remove"}
        </Button>
      </td>
    </tr>
  );
}
