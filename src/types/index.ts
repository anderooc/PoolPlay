export type UserRole = "player" | "captain" | "organizer";

export type TournamentStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "in_progress"
  | "completed";

export type RegistrationStatus = "pending" | "confirmed" | "checked_in";

export type DivisionFormat =
  | "pool_to_bracket"
  | "single_elimination"
  | "double_elimination";

export type BracketType = "single_elimination" | "double_elimination";

export type MatchStatus = "upcoming" | "in_progress" | "completed";

export type TeamMemberRole = "captain" | "player";
