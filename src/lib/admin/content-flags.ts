import { db } from "@/lib/db";
import { contentFlags } from "@/lib/db/schema";
import { findBlockedWord } from "@/lib/utils/content-filter";

interface FlagInput {
  /** Stable key, e.g. "tournament.name", used to filter in the admin UI. */
  area: string;
  /** The exact text the user submitted, kept verbatim for review. */
  text: string | null | undefined;
}

const BLOCKED_MESSAGE =
  "Inappropriate language is not allowed. Please remove offensive words and try again.";

/**
 * Drop-in replacement for `checkContentFilter` that also records the
 * offending text in `content_flags` for admin review. Returns the same
 * error message shape (`string | null`) so callers don't need to change
 * their control flow.
 *
 * Logging failures never bubble up — we'd rather lose an audit entry than
 * block a legitimate write.
 */
export async function flagBlockedContent(
  userId: string | null,
  inputs: FlagInput[]
): Promise<string | null> {
  for (const { area, text } of inputs) {
    if (!text) continue;
    const blocked = findBlockedWord(text);
    if (!blocked) continue;
    try {
      await db.insert(contentFlags).values({
        userId,
        area,
        text,
        blockedWord: blocked,
      });
    } catch {
      // swallow — see comment above
    }
    return BLOCKED_MESSAGE;
  }
  return null;
}
