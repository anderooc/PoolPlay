import { formatSnakeCaseLabel } from "@/lib/utils/format-label";
import type { RegistrationStatus } from "@/types";

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "Pending approval",
  confirmed: "Confirmed",
  checked_in: "Checked in",
};

export function formatRegistrationStatusLabel(status: string): string {
  if (status in REGISTRATION_STATUS_LABELS) {
    return REGISTRATION_STATUS_LABELS[status as RegistrationStatus];
  }
  return formatSnakeCaseLabel(status);
}
