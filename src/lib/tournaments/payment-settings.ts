export type TournamentPaymentSettings = {
  enabled: boolean;
  requiredBeforeConfirm: boolean;
  firstTeamFeeCents: number | null;
  additionalTeamFeeCents: number | null;
  venmoHandle: string | null;
  zelleHandle: string | null;
  cashappHandle: string | null;
  otherInstructions: string | null;
};

export function paymentSettingsFromTournament(tournament: {
  paymentEnabled: boolean;
  paymentRequiredBeforeConfirm: boolean;
  paymentFirstTeamFeeCents: number | null;
  paymentAdditionalTeamFeeCents: number | null;
  paymentVenmoHandle: string | null;
  paymentZelleHandle: string | null;
  paymentCashappHandle: string | null;
  paymentOtherInstructions: string | null;
}): TournamentPaymentSettings {
  return {
    enabled: tournament.paymentEnabled,
    requiredBeforeConfirm: tournament.paymentRequiredBeforeConfirm,
    firstTeamFeeCents: tournament.paymentFirstTeamFeeCents,
    additionalTeamFeeCents: tournament.paymentAdditionalTeamFeeCents,
    venmoHandle: tournament.paymentVenmoHandle,
    zelleHandle: tournament.paymentZelleHandle,
    cashappHandle: tournament.paymentCashappHandle,
    otherInstructions: tournament.paymentOtherInstructions,
  };
}

export function formatFeeCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function paymentMethodLabel(
  method: string | null | undefined
): string {
  switch (method) {
    case "venmo":
      return "Venmo";
    case "zelle":
      return "Zelle";
    case "cashapp":
      return "Cash App";
    case "check":
      return "Check";
    case "cash":
      return "Cash";
    case "other":
      return "Other";
    default:
      return "Not specified";
  }
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "unpaid":
      return "Unpaid";
    case "submitted":
      return "Pending review";
    case "confirmed":
      return "Paid";
    case "waived":
      return "Waived";
    default:
      return status;
  }
}

export function paymentInstructionsText(
  settings: TournamentPaymentSettings
): string | null {
  if (!settings.enabled) return null;

  const lines: string[] = [];
  if (settings.firstTeamFeeCents != null) {
    const additional =
      settings.additionalTeamFeeCents ?? settings.firstTeamFeeCents;
    lines.push(
      `First team per school: ${formatFeeCents(settings.firstTeamFeeCents)}`
    );
    if (additional !== settings.firstTeamFeeCents) {
      lines.push(`Additional teams: ${formatFeeCents(additional)}`);
    }
  }
  if (settings.venmoHandle) {
    lines.push(`Venmo: ${settings.venmoHandle}`);
  }
  if (settings.zelleHandle) {
    lines.push(`Zelle: ${settings.zelleHandle}`);
  }
  if (settings.cashappHandle) {
    lines.push(`Cash App: ${settings.cashappHandle}`);
  }
  if (settings.otherInstructions?.trim()) {
    lines.push(settings.otherInstructions.trim());
  }

  return lines.length > 0 ? lines.join("\n") : null;
}
