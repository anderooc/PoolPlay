"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { updateRegistrationStatus } from "../actions";
import { useState } from "react";

interface Registration {
  id: string;
  status: string;
  registeredAt: Date;
  teamId: string;
  teamName: string;
  teamUniversity: string;
  divisionId: string;
  divisionName: string;
}

export function RegistrationList({
  registrations,
  isOrganizer,
}: {
  registrations: Registration[];
  isOrganizer: boolean;
}) {
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
      {registrations.map((reg) => (
        <RegistrationRow
          key={reg.id}
          registration={reg}
          isOrganizer={isOrganizer}
        />
      ))}
    </div>
  );
}

function RegistrationRow({
  registration,
  isOrganizer,
}: {
  registration: Registration;
  isOrganizer: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(status: "confirmed" | "pending") {
    setLoading(true);
    await updateRegistrationStatus(registration.id, status);
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="font-medium">{registration.teamName}</p>
        <p className="text-sm text-muted-foreground">
          {registration.teamUniversity} &middot; {registration.divisionName}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant={registration.status === "confirmed" ? "default" : "secondary"}
        >
          {registration.status}
        </Badge>
        {isOrganizer && registration.status === "pending" && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => handleStatusChange("confirmed")}
          >
            <Check className="mr-1 h-3 w-3" />
            Confirm
          </Button>
        )}
      </div>
    </div>
  );
}
