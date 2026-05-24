import { z } from "zod/v4";
import { TEAM_GENDERS, TEAM_REGIONS } from "@/lib/constants/team";
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
  gender: z.enum(TEAM_GENDERS, { message: "Select men's or women's" }),
  region: z.enum(TEAM_REGIONS, { message: "Select a region" }),
  schoolId: z.string().uuid().optional().nullable(),
});

export const createSchoolSchema = z.object({
  name: z.string().min(1, "School name is required").max(120),
  university: z.string().min(1, "University is required").max(120),
  gender: z.enum(TEAM_GENDERS, { message: "Select men's or women's" }),
  region: z.enum(TEAM_REGIONS, { message: "Select a region" }),
  description: z.string().max(2000).optional().nullable(),
  websiteUrl: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
  domainHint: z
    .string()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim().length > 0 ? v.trim().toLowerCase() : null)),
});

export const updateSchoolSchema = createSchoolSchema.partial();

export const addSchoolMemberSchema = z.object({
  email: z.email("Enter a valid email"),
  role: z.enum(["officer", "member"], {
    message: "Choose officer or member",
  }),
  title: z
    .string()
    .max(60)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
});

export const createTournamentSchema = z.object({
  hostSchoolId: z.string().uuid("Select the hosting school"),
  name: z.string().min(1, "Tournament name is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
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
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
export type AddSchoolMemberInput = z.infer<typeof addSchoolMemberSchema>;
