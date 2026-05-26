/** Minimum trimmed description length for the listing checklist step. */
export const LISTING_DESCRIPTION_MIN_LENGTH = 10;

export type ListingDetailsCheckInput = {
  description: string | null | undefined;
  address: string | null | undefined;
  hasScheduledMatches: boolean;
};

export type ListingDetailsCheckResult = {
  complete: boolean;
  descriptionMinLength: boolean;
  hasAddress: boolean;
  mentionsEntryFees: boolean;
  documentsStartTime: boolean;
};

export function descriptionMeetsMinLength(
  description: string | null | undefined
): boolean {
  return (description?.trim().length ?? 0) >= LISTING_DESCRIPTION_MIN_LENGTH;
}

/** Heuristic: description mentions fees for first vs additional teams. */
export function descriptionMentionsEntryFees(
  description: string | null | undefined
): boolean {
  if (!description?.trim()) return false;
  const text = description.toLowerCase();
  const dollarAmounts = text.match(/\$\d+(?:\.\d{2})?/g) ?? [];
  const hasFeeWord =
    /entry\s*fees?|registration\s*fees?|team\s*fees?|cost\s*per\s*team|\bfees?\b|\bprice\b|\bcost\b/.test(
      text
    );
  const mentionsFirstTeam = /first\s+team|1st\s+team|\bfirst\b/.test(text);
  const mentionsAdditionalTeam =
    /additional|each\s+(additional|subsequent|extra)|second\s+team|2nd\s+team|every\s+team\s+after|another\s+team/.test(
      text
    );
  const hasFirstAndAdditional = mentionsFirstTeam && mentionsAdditionalTeam;
  const hasFirstTeamPrice = /first.*\$|1st.*\$|\$.*first/.test(text);
  const hasTwoTierPricing =
    dollarAmounts.length >= 2 &&
    (hasFeeWord || mentionsFirstTeam || mentionsAdditionalTeam);
  const hasPerTeamPricing =
    /per\s+team|\/\s*team|each\s+team/.test(text) && dollarAmounts.length >= 1;

  return (
    (hasFeeWord || hasTwoTierPricing || hasPerTeamPricing) &&
    (hasFirstAndAdditional ||
      hasFirstTeamPrice ||
      hasTwoTierPricing ||
      (hasPerTeamPricing && mentionsAdditionalTeam))
  );
}

export function eventStartTimeDocumented(
  description: string | null | undefined,
  hasScheduledMatches: boolean
): boolean {
  if (hasScheduledMatches) return true;
  if (!description?.trim()) return false;
  return /\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\b\d{1,2}:\d{2}\b|\bstarts?\s+(at|@)\b|\bstart\s*(time|at|s)?\b|\bevent\s+begins\b|\barrive\b|\bdoors\s+open\b|\bnoon\b|\bmidnight\b/i.test(
    description
  );
}

export function evaluateListingDetailsChecklist(
  input: ListingDetailsCheckInput
): ListingDetailsCheckResult {
  const { description, address, hasScheduledMatches } = input;
  const descriptionMinLength = descriptionMeetsMinLength(description);
  const hasAddress = Boolean(address?.trim());
  const mentionsEntryFees = descriptionMentionsEntryFees(description);
  const documentsStartTime = eventStartTimeDocumented(
    description,
    hasScheduledMatches
  );

  return {
    complete:
      descriptionMinLength &&
      hasAddress &&
      mentionsEntryFees &&
      documentsStartTime,
    descriptionMinLength,
    hasAddress,
    mentionsEntryFees,
    documentsStartTime,
  };
}

/** Actionable hint listing only what is still missing. */
export function listingDetailsHint(
  result: ListingDetailsCheckResult,
  hasScheduledMatches: boolean
): string {
  if (result.complete) return "";

  const missing: string[] = [];
  if (!result.descriptionMinLength) missing.push("description");
  if (!result.hasAddress) missing.push("address");
  if (!result.mentionsEntryFees) missing.push("fees");
  if (!result.documentsStartTime && !hasScheduledMatches) {
    missing.push("start time");
  }

  return `Add ${missing.join(", ")} in listing details.`;
}
