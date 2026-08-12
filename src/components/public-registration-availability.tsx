/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import type { ReactNode } from "react";
import type { PublicRegistrationAvailability as Availability } from "@/lib/tournaments/public-projection";

function formatRegistrationDeadline(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(value));
}

function AvailabilityMetric({
  label,
  detail,
  children,
}: {
  label: string;
  detail?: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{children}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function PublicRegistrationAvailability({
  availability,
}: {
  availability: Availability;
}) {
  const capacity = availability.capacity;
  const registeredLabel =
    capacity == null
      ? `${availability.registeredCount} teams registered`
      : `${availability.registeredCount} / ${capacity} teams registered`;
  const waitingLabel =
    availability.waitlistCount === 0
      ? "No teams waiting"
      : `${availability.waitlistCount} ${availability.waitlistCount === 1 ? "team" : "teams"} waiting`;

  return (
    <div className="grid gap-3 rounded-lg border border-border/70 bg-card/70 p-4 sm:grid-cols-3">
      <AvailabilityMetric
        label="Capacity"
        detail={capacity == null ? registeredLabel : null}
      >
        {capacity == null ? "Unlimited capacity" : registeredLabel}
      </AvailabilityMetric>
      <AvailabilityMetric label="Deadline">
        {availability.deadline ? (
          <time dateTime={availability.deadline}>
            {formatRegistrationDeadline(availability.deadline)}
          </time>
        ) : (
          "No registration deadline"
        )}
      </AvailabilityMetric>
      <AvailabilityMetric
        label="Waitlist"
        detail={
          availability.waitlistCount > 0
            ? "New requests join the existing queue. The organizer promotes teams."
            : null
        }
      >
        {waitingLabel}
      </AvailabilityMetric>
    </div>
  );
}
