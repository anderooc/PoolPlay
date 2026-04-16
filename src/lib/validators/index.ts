import { z } from "zod/v4";
import { isCollegeEmail } from "@/lib/utils/college-email";

export const signUpSchema = z.object({
  email: z
    .email()
    .refine(
      (val) => isCollegeEmail(val),
      "Use your school email (e.g. name@school.edu or your institution’s domain)."
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(1, "Full name is required"),
  university: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  university: z.string().min(1, "University is required"),
  season: z.string().optional(),
});

export const createTournamentSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().min(1, "Location is required"),
  address: z.string().optional(),
});

export const createDivisionSchema = z.object({
  name: z.string().min(1, "Division name is required"),
  format: z.enum(["pool_to_bracket", "single_elimination", "double_elimination"]),
  teamCap: z.number().int().positive().optional(),
});

export const updateScoreSchema = z.object({
  matchId: z.string().uuid(),
  setNumber: z.number().int().positive(),
  teamAScore: z.number().int().min(0),
  teamBScore: z.number().int().min(0),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type CreateDivisionInput = z.infer<typeof createDivisionSchema>;
export type UpdateScoreInput = z.infer<typeof updateScoreSchema>;
