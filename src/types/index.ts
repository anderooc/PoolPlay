export type UserRole = "player" | "captain" | "organizer" | "admin";

export type TournamentStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "in_progress"
  | "completed";

export type RegistrationStatus = "pending" | "confirmed" | "checked_in";

export type TournamentChatChannelKind =
  | "announcements"
  | "questions"
  | "general";

export type RegistrationPaymentStatus =
  | "unpaid"
  | "submitted"
  | "confirmed"
  | "waived";

export type RegistrationPaymentMethod =
  | "venmo"
  | "zelle"
  | "cashapp"
  | "check"
  | "cash"
  | "other";

export type DivisionFormat =
  | "pool_to_bracket"
  | "single_elimination"
  | "double_elimination";

export type BracketType = "single_elimination" | "double_elimination";

export type MatchStatus = "upcoming" | "in_progress" | "completed";

export type TeamMemberRole = "captain" | "player";

export type SchoolMemberRole = "president" | "officer" | "member";

export type SchoolVerificationStatus = "pending" | "verified" | "rejected";

/** Standalone teams (no parent school) use the same review states as schools. */
export type TeamVerificationStatus = SchoolVerificationStatus;

export type TeamGender = "mens" | "womens";

export type TeamRegion =
  | "north"
  | "northeast"
  | "east"
  | "east_central"
  | "central"
  | "south"
  | "southeast"
  | "west"
  | "northwest";
